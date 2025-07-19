// app/api/user/metadata/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";
import {
  FREE_DAILY_STORY_LIMIT,
  isSubscribedFromStripeObjects,
  todayUTC,
} from "@/lib/constants";

// ---------- Stripe Client ----------
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

// ---------- Types ----------
interface UserMetadataDoc {
  userEmail: string;
  totalReads: number;
  lastLogin: string;
  dailyCount: number;
  dailyDate: string; // YYYY-MM-DD (UTC)
}

// ---------- Helpers ----------
async function getOrInitUserMetadata(db: any, userEmail: string): Promise<UserMetadataDoc> {
  const coll = db.collection("userMetadata");
  const today = todayUTC();
  let doc: UserMetadataDoc | null = await coll.findOne({ userEmail });

  if (!doc) {
    doc = {
      userEmail,
      totalReads: 0,
      lastLogin: new Date().toISOString(),
      dailyCount: 0,
      dailyDate: today,
    };
    await coll.insertOne(doc);
  } else {
    // Reset daily counters if crossing day boundary
    if (doc.dailyDate !== today) {
      await coll.updateOne(
        { userEmail },
        { $set: { dailyCount: 0, dailyDate: today } }
      );
      doc.dailyCount = 0;
      doc.dailyDate = today;
    }
  }
  return doc;
}

async function resolveSubscriptionStatus(userEmail: string) {
  if (!process.env.STRIPE_SECRET_KEY) return false;
  const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
  const customer = customers.data[0];
  if (!customer) return false;
  const subs = await stripe.subscriptions.list({
    customer: customer.id,
    status: "active",
    limit: 5,
  });
  return isSubscribedFromStripeObjects(subs.data);
}

// ---------- GET (Fetch current metadata + subscription + paywall state) ----------
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");

  const doc = await getOrInitUserMetadata(db, userEmail);
  const subscriptionStatus = await resolveSubscriptionStatus(userEmail);

  // Determine if user is paywalled (only if *not* subscribed)
  const isOverFreeLimit = !subscriptionStatus && doc.dailyCount >= FREE_DAILY_STORY_LIMIT;
  const remainingFreeReads = subscriptionStatus
    ? Infinity
    : Math.max(FREE_DAILY_STORY_LIMIT - doc.dailyCount, 0);

  return NextResponse.json({
    totalReads: doc.totalReads,
    lastLogin: doc.lastLogin,
    dailyCount: doc.dailyCount,
    subscriptionStatus,
    freeLimit: FREE_DAILY_STORY_LIMIT,
    remainingFreeReads,
    isOverFreeLimit,
  });
}

// ---------- POST (Increment read counts when a story is opened) ----------
/**
 * Body: { incrementDaily?: boolean }
 * - incrementDaily (default true) allows optional suppression if needed.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection("userMetadata");

  const { incrementDaily = true } = await (async () => {
    try {
      return await request.json();
    } catch {
      return {};
    }
  })();

  // Ensure doc and day freshness
  let doc = await getOrInitUserMetadata(db, userEmail);
  const subscriptionStatus = await resolveSubscriptionStatus(userEmail);

  // If already subscribed we do not enforce daily cap, but we still increment counters.
  // If not subscribed and at/over limit, we DO NOT increment dailyCount (to keep stable),
  // but we still may want to track totalReads only if below limit.
  const today = todayUTC();
  const now = new Date().toISOString();

  const update: any = { $set: { lastLogin: now } };
  if (incrementDaily) {
    // totalReads always increments to measure engagement
    update.$inc = { totalReads: 1 };

    if (subscriptionStatus) {
      // Subscriber: dailyCount increments freely
      update.$inc.dailyCount = 1;
    } else {
      // Free user: only increment dailyCount if still under limit
      if (doc.dailyCount < FREE_DAILY_STORY_LIMIT) {
        update.$inc.dailyCount = 1;
      }
    }
  }

  // Apply update
  await coll.updateOne({ userEmail }, update);

  // Re-fetch
  doc = await getOrInitUserMetadata(db, userEmail);

  const isOverFreeLimit =
    !subscriptionStatus && doc.dailyCount >= FREE_DAILY_STORY_LIMIT;
  const remainingFreeReads = subscriptionStatus
    ? Infinity
    : Math.max(FREE_DAILY_STORY_LIMIT - doc.dailyCount, 0);

  return NextResponse.json({
    totalReads: doc.totalReads,
    lastLogin: doc.lastLogin,
    dailyCount: doc.dailyCount,
    subscriptionStatus,
    freeLimit: FREE_DAILY_STORY_LIMIT,
    remainingFreeReads,
    isOverFreeLimit,
    dailyDate: doc.dailyDate,
    today,
  });
}