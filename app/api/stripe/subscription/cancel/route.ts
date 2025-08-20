import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { clientPromise } from '@/lib/mongoClient';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbName = process.env.MONGODB_DB_NAME || 'kofa';
    const db = (await clientPromise).db(dbName);
    const users = db.collection('users');

    const user = await users.findOne({ email: session.user.email });
    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 400 }
      );
    }

    // Find their active subscription (limit 1 is fine if customers only ever have one sub)
    const list = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1,
    });
    const sub = list.data[0];
    if (!sub) {
      return NextResponse.json(
        { error: 'No active subscription to cancel' },
        { status: 400 }
      );
    }

    // Cancel at end of current period so they retain access until then
    const updated = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: true,
    });

    // Do NOT mark hasActiveSub=false yet, since access remains until period end.
    // Let your Stripe webhook flip the flag when the sub actually ends.
    const endsAt = updated.current_period_end
      ? new Date(updated.current_period_end * 1000).toISOString()
      : null;

    return NextResponse.json(
      {
        success: true,
        cancelAtPeriodEnd: true,
        subscriptionId: updated.id,
        endsAt,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[stripe.cancel] error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}