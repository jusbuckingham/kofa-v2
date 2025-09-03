import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { clientPromise } from '@/lib/mongoClient';
import type Stripe from 'stripe';


export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Narrow user document shape we care about
interface UserDoc {
  _id?: unknown;
  email: string;
  stripeCustomerId?: string;
}

function siteReturnUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000';
  return raw.startsWith('http') ? `${raw.replace(/\/$/, '')}/dashboard` : `https://${raw.replace(/\/$/, '')}/dashboard`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const dbName = process.env.MONGODB_DB_NAME || 'kofa';
    const db = (await clientPromise).db(dbName);
    const users = db.collection<UserDoc>('users');
    const email = session.user.email.trim().toLowerCase();
    const user = await users.findOne({ email }, { projection: { stripeCustomerId: 1 } });

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ data: null }, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Prefer an active/trialing subscription; fall back to most-recent otherwise
    const [activeList, trialingList] = await Promise.all([
      stripe.subscriptions.list({ customer: user.stripeCustomerId, status: 'active', limit: 1, expand: ['data.items.data.price'] }),
      stripe.subscriptions.list({ customer: user.stripeCustomerId, status: 'trialing', limit: 1, expand: ['data.items.data.price'] }),
    ]);

    let sub: Stripe.Subscription | null = activeList.data[0] ?? trialingList.data[0] ?? null;

    if (!sub) {
      // Last-ditch: fetch most recent non-canceled subscription
      const anyList = await stripe.subscriptions.list({ customer: user.stripeCustomerId, limit: 1, expand: ['data.items.data.price'] });
      sub = anyList.data.find(s => s.status !== 'canceled') ?? null;
    }

    if (sub) {
      const item = sub.items.data[0];
      const price = item?.price as Stripe.Price | undefined;

      return NextResponse.json(
        {
          data: {
            id: sub.id,
            status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            current_period_end: sub.current_period_end,
            // Existing compact label for convenience
            plan:
              (price?.nickname as string | undefined) ||
              (price?.id as string | undefined) ||
              'unknown',
            // New detailed pricing fields for UI
            priceId: price?.id ?? null,
            productId:
              typeof price?.product === 'string'
                ? (price?.product as string)
                : (price?.product as Stripe.Product | undefined)?.id ?? null,
            amount: price?.unit_amount ?? null, // amount in cents
            currency: price?.currency ?? null,
            interval: price?.recurring?.interval ?? null,
            interval_count: price?.recurring?.interval_count ?? null,
            nickname: price?.nickname ?? null,
            // ISO string convenience (derived from current_period_end)
            current_period_end_iso: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          },
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      {
        data: null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'failed';
    return NextResponse.json({ error: message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(req: Request) {
  type Action = 'portal';
  type Body = { action?: Action };

  const contentType = req.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const emptyBody: Body = {};
  const body: Body = isJson ? (await req.json().catch(() => emptyBody)) : emptyBody;
  const action: Action | undefined = body.action;

  if (action !== 'portal') {
    return NextResponse.json({ error: 'unsupported_action' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const dbName = process.env.MONGODB_DB_NAME || 'kofa';
    const db = (await clientPromise).db(dbName);
    const users = db.collection<UserDoc>('users');
    const email = session.user.email.trim().toLowerCase();
    const user = await users.findOne({ email }, { projection: { stripeCustomerId: 1 } });

    const customerId = user?.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json({ error: 'no_customer' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: siteReturnUrl(),
    });

    return NextResponse.json({ url: portal.url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'failed';
    return NextResponse.json({ error: 'portal_error', message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}