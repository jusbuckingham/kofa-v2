import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { clientPromise } from '@/lib/mongoClient';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = (await clientPromise).db(process.env.MONGODB_DB_NAME);
  const users = db.collection('users');
  const user = await users.findOne({ email: session.user.email });
  if (!user?.stripeCustomerId) {
    return NextResponse.json({ data: null });
  }

  const subs = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: 'all',
    limit: 1,
  });
  const sub = subs.data[0] || null;

  return NextResponse.json({
    data: sub
      ? {
          id: sub.id,
          status: sub.status,
          current_period_end: sub.current_period_end,
          plan:
            sub.items.data[0].price.nickname ||
            sub.items.data[0].price.id,
        }
      : null,
  });
}