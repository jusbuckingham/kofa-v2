import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" })
  : null;

// Where to send users after they close the portal
const RETURN_HOST =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.VERCEL_URL ||
  "http://localhost:3000";

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  let customerId: string | undefined;
  try {
    const body = await req.json();
    customerId = body?.customerId as string | undefined;
  } catch {
    // ignore; handled below
  }

  if (!customerId) {
    return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
  }

  try {
    const returnUrl =
      typeof RETURN_HOST === "string" && RETURN_HOST.startsWith("http")
        ? RETURN_HOST
        : `https://${RETURN_HOST}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("[stripe/portal] create failed", err);
    return NextResponse.json({ error: "Portal session failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}