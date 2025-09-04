import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clientPromise } from "@/lib/mongoClient";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" })
  : null;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Build a safe return URL based on request headers, fallback to env
function resolveReturnUrl(req: NextRequest) {
  const hdrHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || process.env.VERCEL_URL || "localhost:3000";
  const hdrProto = req.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || undefined;
  if (envUrl && envUrl.startsWith("http")) return envUrl;
  const hostLike = envUrl || hdrHost;
  return hostLike.startsWith("http") ? hostLike : `${hdrProto}://${hostLike}`;
}

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const email = session.user.email.toLowerCase();
  const db = (await clientPromise).db(process.env.MONGODB_DBNAME || process.env.MONGODB_DB || "kofa");
  const userMeta = db.collection<{ email?: string; userEmail?: string; stripeCustomerId?: string }>("user_metadata");
  const doc = await userMeta.findOne({ $or: [{ email }, { userEmail: email }] });
  const customerId = doc?.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json({ error: "No Stripe customer on file" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const returnUrl = resolveReturnUrl(req);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[stripe/portal] create failed", err);
    return NextResponse.json({ error: "Portal session failed" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
}