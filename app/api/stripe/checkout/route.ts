// app/api/stripe/checkout/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { clientPromise } from '@/lib/mongoClient';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Connect to DB
    const db = (await clientPromise).db(process.env.MONGODB_DB_NAME);
    const users = db.collection('users');

    // Retrieve or create Stripe customer for signed-in user
    const userEmail = session.user.email;
    const user = await users.findOne({ email: userEmail });
    let stripeCustomerId = user?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { email: userEmail },
      });
      stripeCustomerId = customer.id;
      await users.updateOne(
        { email: userEmail },
        { $set: { stripeCustomerId, hasActiveSub: false } },
        { upsert: true }
      );
    }

    // Resolve price ID from environment (with legacy fallback)
    let priceId =
      process.env.STRIPE_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID;
    // If a Product ID was provided, fetch its first active Price
    if (priceId?.startsWith('prod_')) {
      const priceList = await stripe.prices.list({
        product: priceId,
        active: true,
        limit: 1,
      });
      if (priceList.data.length > 0) {
        const fallbackPrice = priceList.data[0].id;
        console.warn(`Resolved fallback price ID ${fallbackPrice} for product ${priceId}`);
        priceId = fallbackPrice;
      }
    }
    if (!priceId) {
      console.error(
        'Missing both STRIPE_PRICE_ID and STRIPE_PRO_PRICE_ID',
        {
          STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,
          STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID,
        }
      );
      throw new Error("Missing STRIPE_PRICE_ID environment variable");
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin) {
      throw new Error("Missing NEXT_PUBLIC_SITE_URL environment variable");
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      cancel_url: `${origin}/pricing`,
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
    });

    return NextResponse.json({ url: checkoutSession.url }, { status: 200 });
  } catch (err: unknown) {
    console.error('Stripe checkout session creation failed:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}