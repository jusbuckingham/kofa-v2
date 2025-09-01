import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { clientPromise } from '@/lib/mongoClient';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;
const STRIPE_CONFIGURED = Boolean(stripe);

export const runtime = 'nodejs';

/**
 * Cancel a user's Stripe subscription.
 * - Default: cancel at period end (keeps access until then).
 * - If body `{ immediate: true }` is sent, cancels immediately.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
    }

    if (!STRIPE_CONFIGURED) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: NO_STORE });
    }

    const email = session.user.email.toLowerCase();

    const dbName = process.env.MONGODB_DB_NAME || 'kofa';
    const db = (await clientPromise).db(dbName);
    const users = db.collection('users');

    const user = await users.findOne<{ stripeCustomerId?: string }>({
      email,
    });
    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found for user' },
        { status: 404, headers: NO_STORE }
      );
    }

    // Accept optional `{ immediate: boolean }` in request body
    let immediate = false;
    try {
      const json = await req.json();
      if (json && typeof json.immediate === 'boolean') {
        immediate = json.immediate;
      }
    } catch {
      // no body provided is fine
    }

    // We consider sub cancelable if it's active, trialing, past_due or unpaid.
    const list = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      limit: 10,
      expand: ['data.default_payment_method'],
    });

    const cancelable = list.data.find(
      (s) =>
        !s.cancel_at_period_end &&
        ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status)
    );

    if (!cancelable) {
      return NextResponse.json(
        { error: 'No active/trialing subscription to cancel' },
        { status: 404, headers: NO_STORE }
      );
    }

    if (immediate) {
      const canceled = await stripe.subscriptions.cancel(cancelable.id);
      // Do NOT mark hasActiveSub=false here; let webhook do it on `customer.subscription.deleted`
      return NextResponse.json(
        {
          success: true,
          immediate: true,
          subscriptionId: canceled.id,
          status: canceled.status,
          endedAt: canceled.ended_at
            ? new Date(canceled.ended_at * 1000).toISOString()
            : null,
        },
        { status: 200, headers: NO_STORE }
      );
    }

    const updated = await stripe.subscriptions.update(cancelable.id, {
      cancel_at_period_end: true,
    });

    const endsAt = updated.current_period_end
      ? new Date(updated.current_period_end * 1000).toISOString()
      : null;

    return NextResponse.json(
      {
        success: true,
        immediate: false,
        cancelAtPeriodEnd: true,
        subscriptionId: updated.id,
        endsAt,
        status: updated.status,
      },
      { status: 200, headers: NO_STORE }
    );
  } catch (err) {
    console.error('[stripe.cancel] error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE });
  }
}