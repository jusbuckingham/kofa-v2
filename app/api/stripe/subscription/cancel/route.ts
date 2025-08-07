import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import clientPromise from '@/lib/mongoClient';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = (await clientPromise).db(process.env.MONGODB_DB_NAME);
  const users = db.collection('users');
  const user = await users.findOne({ email: session.user.email });
  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No Stripe customer found' },
      { status: 400 }
    );
  }

  // Find their active subscription
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

  // Cancel it immediately
  await stripe.subscriptions.del(sub.id);
  await users.updateOne(
    { email: session.user.email },
    { $set: { hasActiveSub: false } }
  );

  return NextResponse.json({ success: true });
}