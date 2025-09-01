// app/api/stripe/checkout/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { clientPromise } from "@/lib/mongoClient";

import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email.toLowerCase();

  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  try {
    // Connect to DB
    const dbName = process.env.MONGODB_DB_NAME || "kofa";
    const db = (await clientPromise).db(dbName);
    const users = db.collection("users");

    // Retrieve or create Stripe customer for signed-in user
    const user = await users.findOne({ email: userEmail });
    let stripeCustomerId = user?.stripeCustomerId as string | undefined;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { email: userEmail },
      });
      stripeCustomerId = customer.id;

      await users.updateOne(
        { email: userEmail },
        {
          $set: {
            email: userEmail,
            stripeCustomerId,
          },
          $setOnInsert: {
            hasActiveSub: false,
            createdAt: new Date(),
          },
          $currentDate: { updatedAt: true },
        },
        { upsert: true }
      );
    }

    // Optional body override for priceId (used sparingly)
    let bodyPriceId: string | undefined;
    try {
      const body = await req.json();
      bodyPriceId = typeof body?.priceId === "string" ? body.priceId : undefined;
    } catch {
      // ignore non-JSON body
    }
    // Resolve price ID from environment (with legacy fallback), prefer body override
    let priceId = bodyPriceId || process.env.STRIPE_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID;
    // If a Product ID was provided, fetch its first active Price
    if (priceId?.startsWith("prod_")) {
      const priceList = await stripe.prices.list({
        product: priceId,
        active: true,
        limit: 1,
      });
      if (priceList.data.length > 0) {
        const fallbackPrice = priceList.data[0].id;
        console.warn(
          `[stripe:checkout] Provided a product id. Resolved first active price ${fallbackPrice} for product ${priceId}`
        );
        priceId = fallbackPrice;
      }
    }
    if (!priceId) {
      console.error("[stripe:checkout] Missing STRIPE_PRICE_ID / STRIPE_PRO_PRICE_ID");
      throw new Error("Missing STRIPE_PRICE_ID environment variable");
    }

    // Compute origin from request headers first, then env fallback
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const headerOrigin = `${proto}://${host}`;
    const envOrigin = process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.length > 0
      ? process.env.NEXT_PUBLIC_SITE_URL
      : undefined;
    const origin = envOrigin ?? headerOrigin;
    if (!envOrigin && host.startsWith("localhost")) {
      console.warn("[stripe:checkout] NEXT_PUBLIC_SITE_URL not set; using header origin:", origin);
    }

    // Create Checkout Session (subscription)
    // NOTE: You cannot set both `customer` and `customer_email`. We pass `customer`.
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      cancel_url: `${origin}/pricing`,
      success_url: `${origin}/dashboard?subscribe=success&session_id={CHECKOUT_SESSION_ID}`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: userEmail, // handy for debugging/reconciliation
      metadata: {
        email: userEmail,
      },
      subscription_data: {
        metadata: {
          email: userEmail,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url }, { status: 200 });
  } catch (err: unknown) {
    console.error("[stripe:checkout] Session creation failed:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    const code =
      typeof err === "object" && err && "code" in (err as Record<string, unknown>)
        ? String((err as Record<string, unknown>).code)
        : undefined;
    return NextResponse.json({ error: message, code }, { status: 500 });
  }
}