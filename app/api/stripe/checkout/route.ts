import { NextResponse } from "next/server";
import Stripe from "stripe";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

export async function POST() {
  // 1. Authenticate the user
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  // 2. Ensure we have a Stripe customer for this user
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const users = db.collection("users");
  const user = await users.findOne({ userEmail });
  let customerId = user?.stripeCustomerId as string | undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: userEmail });
    customerId = customer.id;
    await users.updateOne(
      { userEmail },
      { $set: { stripeCustomerId: customerId } }
    );
  }

  // 3. Create a Checkout Session for your Pro plan
  const priceId = process.env.STRIPE_PRO_PRICE_ID!;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pricing`,
  });

  // 4. Return the session URL
  return NextResponse.json({ url: checkoutSession.url });
}