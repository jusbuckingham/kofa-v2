// app/api/stripe/checkout/route.ts
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

export async function POST(request: Request) {
  // 1) Ensure user is signed in
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Pull your Pro price ID from environment
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: "Price ID not configured" }, { status: 500 });
  }

  // 3) Build success/cancel URLs
  const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL;
  const success_url = `${origin}/dashboard`;
  const cancel_url = `${origin}/pricing`;

  // 4) Create the Checkout session
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: session.user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url,
    cancel_url,
  });

  // 5) Return the URL for client-side redirect
  return NextResponse.json({ url: checkoutSession.url });
}