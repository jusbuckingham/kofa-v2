// app/api/stripe/checkout/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { priceId } = await req.json();
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const checkoutSession = await stripe.checkout.sessions.create({
      cancel_url: `${origin}/pricing`,
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { email: session.user.email },
    });

    return NextResponse.json({ url: checkoutSession.url }, { status: 200 });
  } catch (err) {
    console.error('Stripe checkout session creation failed:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}