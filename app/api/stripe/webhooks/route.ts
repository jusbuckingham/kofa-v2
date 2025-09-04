// app/api/stripe/webhooks/route.ts
// NOTE: Ensure STRIPE_WEBHOOK_SECRET is the **LIVE** secret for the https://kofa.ai/api/stripe/webhooks endpoint.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getDb } from '@/lib/mongoClient';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' }) : null;

export async function POST(req: NextRequest) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook] Missing Stripe configuration.', {
      hasSecretKey: Boolean(STRIPE_SECRET_KEY),
      hasWebhookSecret: Boolean(STRIPE_WEBHOOK_SECRET),
    });
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  let rawBody: string;
  try {
    rawBody = await req.text(); // must be the raw (unparsed) body
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    console.error('❌ Webhook signature verification failed:', (err as Error).message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  console.log('[webhook] received', { type: event.type, id: event.id });

  // Relevant Stripe event types
  const relevant = new Set<Stripe.Event['type']>([
    // Checkout completes (immediate) or when async payments settle
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',

    // Subscription lifecycle
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.paused',
    'customer.subscription.resumed',
    'customer.subscription.trial_will_end',

    // Billing signals
    'invoice.payment_failed',
  ]);

  if (!relevant.has(event.type)) {
    console.debug('[webhook] Ignored event type:', event.type, 'id:', event.id);
    return NextResponse.json({ received: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }

  // Idempotency: skip if we've already processed this Stripe event
  const db = await getDb();
  const processed = db.collection<{ _id: string }>('stripe_events');
  try {
    const already = await processed.findOne({ _id: event.id });
    if (already) {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }
    await processed.insertOne({ _id: event.id });
  } catch {
    // If idempotency storage fails, we still attempt to process; worst case, we may handle twice.
  }

  const users = db.collection('user_metadata');
  const usersCore = db.collection('users');

  const upsertUserByCustomer = async ({
    customerId,
    email,
    subscription,
  }: {
    customerId: string;
    email?: string | null;
    subscription?: Stripe.Subscription | null;
  }) => {
    const normEmail = email ? email.toLowerCase() : null;
    const status = subscription?.status ?? null;
    const hasActiveSub = status === 'active' || status === 'trialing' || status === 'past_due';

    console.log('[webhook] upsert user', {
      customerId,
      email: normEmail,
      status,
      hasActiveSub,
    });

    await users.updateOne(
      normEmail ? { $or: [{ stripeCustomerId: customerId }, { email: normEmail }] } : { stripeCustomerId: customerId },
      {
        $set: {
          email: normEmail ?? undefined,
          stripeCustomerId: customerId,
          hasActiveSub,
          subscriptionStatus: subscription?.status ?? null,
          subscriptionCurrentPeriodEnd: subscription?.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
        },
      },
      { upsert: true }
    );
    // Also mirror stripeCustomerId on the users collection for consistency
    try {
      if (email) {
        await usersCore.updateOne(
          { email: normEmail! },
          { $set: { email: normEmail, stripeCustomerId: customerId } }
        );
      }
    } catch {
      // non-fatal; some installs may not use the core users collection
    }
  };

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string | undefined;

        console.log('[webhook] checkout.session.completed', { customerId, subscriptionId, email: session.customer_details?.email ?? null });

        let subscription: Stripe.Subscription | null = null;
        if (subscriptionId) {
          subscription = await stripe.subscriptions.retrieve(subscriptionId);
        }

        await upsertUserByCustomer({
          customerId,
          email: session.customer_details?.email ?? null,
          subscription,
        });
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string | null;

        console.log('[webhook] checkout.session.async_payment_failed', { customerId });

        if (!customerId) break;
        await users.updateOne(
          { stripeCustomerId: customerId },
          { $set: { hasActiveSub: false, subscriptionStatus: 'payment_failed' } }
        );
        break;
      }

      case 'customer.subscription.paused': {
        const subscription = event.data.object as Stripe.Subscription;

        console.log('[webhook] customer.subscription.paused', { customerId: subscription.customer as string, status: subscription.status });

        await users.updateOne(
          { stripeCustomerId: subscription.customer as string },
          { $set: { hasActiveSub: false, subscriptionStatus: 'paused' } }
        );
        break;
      }
      case 'customer.subscription.resumed': {
        const subscription = event.data.object as Stripe.Subscription;

        console.log('[webhook] customer.subscription.resumed', { customerId: subscription.customer as string, status: subscription.status });

        await upsertUserByCustomer({
          customerId: subscription.customer as string,
          subscription,
        });
        break;
      }
      case 'customer.subscription.trial_will_end': {
        // No state change; could send email/notification in the future.
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        console.log('[webhook] customer.subscription.change', { type: event.type, customerId: subscription.customer as string, status: subscription.status });

        await upsertUserByCustomer({
          customerId: subscription.customer as string,
          subscription,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | null;

        console.log('[webhook] invoice.payment_failed', { customerId, status: invoice.status });

        if (!customerId) break;
        await users.updateOne(
          { stripeCustomerId: customerId },
          { $set: { hasActiveSub: false, subscriptionStatus: 'payment_failed' } }
        );
        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (err: unknown) {
    console.error('Webhook handler error:', {
      message: (err as Error).message,
      eventId: event.id,
      eventType: event.type,
    });
    return NextResponse.json({ error: 'Webhook error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, mode: 'webhook' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}