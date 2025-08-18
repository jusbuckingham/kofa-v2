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

export async function POST(req: Request) {
  type Body = { action?: string };
  const contentType = req.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const emptyBody: Body = {};
  const body: Body = isJson ? (await req.json().catch(() => emptyBody)) : emptyBody;
  const action = typeof body?.action === "string" ? body.action : undefined;

  if (action !== "portal") {
    return NextResponse.json({ error: "unsupported_action" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = (await clientPromise).db(process.env.MONGODB_DB_NAME);
    const users = db.collection("users");
    const user = await users.findOne({ email: session.user.email });

    const customerId = (session.user as { stripeCustomerId?: string } | undefined)?.stripeCustomerId || user?.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json({ error: "no_customer" }, { status: 400 });
    }

    const returnUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000/dashboard";

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json(
      { error: "portal_error", message },
      { status: 500 }
    );
  }
}