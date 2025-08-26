// app/api/stripe/webhooks/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse, NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getDb } from '@/lib/mongoClient';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('[webhook] Missing STRIPE_SECRET_KEY');
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('[webhook] Missing STRIPE_WEBHOOK_SECRET');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' });

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  let buf: ArrayBuffer;
  try {
    buf = await req.arrayBuffer();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      Buffer.from(buf),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    console.error('❌ Webhook signature verification failed:', (err as Error).message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  // Relevant Stripe event types
  const relevant = new Set<Stripe.Event['type']>([
    // Checkout completes (immediate) or when async payments settle
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',

    // Subscription lifecycle
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',

    // Billing signals
    'invoice.payment_failed',
  ]);

  if (!relevant.has(event.type)) {
    return NextResponse.json({ received: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }

  const db = await getDb();
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
    const hasActiveSub =
      subscription?.status === 'active' || subscription?.status === 'trialing';

    await users.updateOne(
      email
        ? { $or: [{ stripeCustomerId: customerId }, { email }] }
        : { stripeCustomerId: customerId },
      {
        $set: {
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
          { email: email.toLowerCase() },
          { $set: { stripeCustomerId: customerId } }
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

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertUserByCustomer({
          customerId: subscription.customer as string,
          subscription,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        await users.updateOne(
          { stripeCustomerId: customerId },
          { $set: { hasActiveSub: false, subscriptionStatus: 'payment_failed' } }
        );
        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (err: unknown) {
    console.error('Webhook handler error:', (err as Error).message);
    return NextResponse.json({ error: 'Webhook error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}