// app/api/user/metadata/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

const TODAY = () => new Date().toISOString().split("T")[0]; // “YYYY-MM-DD”

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection("userMetadata");

  const today = TODAY();
  let totalReads = 0;
  let lastLogin = new Date().toISOString();
  let dailyCount = 0;

  const doc = await coll.findOne({ userEmail });
  if (!doc) {
    // first‐time user: create record
    await coll.insertOne({ userEmail, totalReads, lastLogin, dailyCount, dailyDate: today });
  } else {
    totalReads = doc.totalReads || 0;
    lastLogin = doc.lastLogin || lastLogin;

    if (doc.dailyDate !== today) {
      // reset today’s count
      await coll.updateOne(
        { userEmail },
        { $set: { dailyCount: 0, dailyDate: today } }
      );
      dailyCount = 0;
    } else {
      dailyCount = doc.dailyCount || 0;
    }
  }

  // 2) Check Stripe for an active subscription via customer lookup
  const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
  const customerId = customers.data[0]?.id;
  const subs = customerId
    ? await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      })
    : { data: [] };
  const subscriptionStatus = subs.data.length > 0;

  return NextResponse.json({
    totalReads,
    lastLogin,
    dailyCount,
    subscriptionStatus,
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection("userMetadata");

  const today = TODAY();
  const now = new Date().toISOString();

  const doc = await coll.findOne({ userEmail });
  if (!doc) {
    // first read ever
    await coll.insertOne({
      userEmail,
      totalReads: 1,
      lastLogin: now,
      dailyCount: 1,
      dailyDate: today,
    });
  } else if (doc.dailyDate !== today) {
    // new day: reset dailyCount to 1
    await coll.updateOne(
      { userEmail },
      {
        $inc: { totalReads: 1 },
        $set: { lastLogin: now, dailyCount: 1, dailyDate: today },
      }
    );
  } else {
    // same day: just increment
    await coll.updateOne(
      { userEmail },
      {
        $inc: { totalReads: 1, dailyCount: 1 },
        $set: { lastLogin: now },
      }
    );
  }

  // return updated values
  const updated = await coll.findOne({ userEmail });
  return NextResponse.json({
    totalReads: updated?.totalReads ?? 0,
    lastLogin: updated?.lastLogin ?? now,
    dailyCount: updated?.dailyCount ?? 0,
  });
}