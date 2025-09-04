import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongoClient";
import { getServerSession } from "next-auth/next";
import type { SubscriptionStatus } from "@/lib/constants";
import { FREE_DAILY_STORY_LIMIT, todayUtcISO, todayUTC } from "@/lib/constants";
import { authOptions } from "@/lib/auth";

import type { WithId } from "mongodb";
import { ObjectId } from "mongodb";

interface UserMetadataDoc {
  _id?: ObjectId;
  userEmail: string;
  email?: string; // legacy/compat field
  totalReads: number;
  lastLogin: Date;
  dailyCount: number;
  dailyDate: string; // YYYY-MM-DD
  subscriptionStatus: SubscriptionStatus;
  canReadToday?: boolean;
  hasActiveSub?: boolean; // compat flag that may be present from webhook
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const normEmail = session.user.email.toLowerCase();
    const userEmail = normEmail;
    const today = todayUtcISO();
    const db = await getDb();
    const coll = db.collection<UserMetadataDoc>("user_metadata");
    // Ensure indexes exist for faster lookups
    await coll.createIndex({ userEmail: 1 }, { name: "userEmail_1" });
    await coll.createIndex({ email: 1 }, { name: "email_1" });

    let doc: WithId<UserMetadataDoc> | null = await coll.findOne({ $or: [{ userEmail }, { email: userEmail }] });
    if (!doc) {
      const newDoc: UserMetadataDoc = {
        userEmail,
        email: userEmail,
        totalReads: 0,
        lastLogin: todayUTC(),
        dailyCount: 0,
        dailyDate: todayUtcISO(),
        subscriptionStatus: "none",
      };
      const insertResult = await coll.insertOne(newDoc);
      doc = { _id: insertResult.insertedId, ...newDoc } as WithId<UserMetadataDoc>;
    }

    if (!doc) {
      throw new Error("Failed to load or create user metadata document");
    }

    const sessionActive = Boolean(session.user.hasActiveSub);
    const dbActive = doc.subscriptionStatus === "active" || doc.hasActiveSub === true;
    const hasActive = sessionActive || dbActive;

    const currentDailyCount = doc.dailyDate === today ? (doc.dailyCount ?? 0) : 0;
    const computedCanRead = hasActive || currentDailyCount < FREE_DAILY_STORY_LIMIT;
    const computedStatus: SubscriptionStatus = hasActive ? "active" : (doc.subscriptionStatus || "none");

    const shouldPersist = doc.canReadToday !== computedCanRead || doc.subscriptionStatus !== computedStatus || doc.dailyDate !== today;

    if (shouldPersist) {
      await coll.updateOne(
        { _id: doc._id },
        {
          $set: {
            userEmail,
            email: userEmail,
            canReadToday: computedCanRead,
            subscriptionStatus: computedStatus,
            dailyDate: today,
            dailyCount: currentDailyCount,
            lastLogin: todayUTC(),
          },
        }
      );
      doc = { ...doc, canReadToday: computedCanRead, subscriptionStatus: computedStatus, dailyDate: today, dailyCount: currentDailyCount } as typeof doc;
    }

    return NextResponse.json({ metadata: { ...doc, hasActiveSub: hasActive } }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[user/metadata][GET] failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const userEmail = session.user.email.toLowerCase();
    const { incrementRead = false } = (await request.json()) as {
      incrementRead?: boolean;
    };

    const db = await getDb();
    const coll = db.collection<UserMetadataDoc>("user_metadata");
    // Ensure indexes exist for faster lookups
    await coll.createIndex({ userEmail: 1 }, { name: "userEmail_1" });
    await coll.createIndex({ email: 1 }, { name: "email_1" });

    const existing = await coll.findOne({ $or: [{ userEmail }, { email: userEmail }] });
    const sessionActive = Boolean(session.user.hasActiveSub);
    const dbActive = existing?.subscriptionStatus === "active" || existing?.hasActiveSub === true;
    const hasActive = sessionActive || dbActive;

    const today = todayUtcISO();
    const result = await coll.findOneAndUpdate(
      { $or: [{ userEmail }, { email: userEmail }] },
      [
        {
          $set: {
            userEmail,
            email: userEmail,
            dailyDate: {
              $cond: [{ $eq: ["$dailyDate", today] }, "$dailyDate", today],
            },
            subscriptionStatus: hasActive ? "active" : { $ifNull: ["$subscriptionStatus", "none"] },
            lastLogin: todayUTC(),
          },
        },
        {
          $set: {
            dailyCount: {
              $cond: [
                { $eq: ["$dailyDate", today] },
                { $add: [{ $ifNull: ["$dailyCount", 0] }, incrementRead ? 1 : 0] },
                incrementRead ? 1 : 0,
              ],
            },
          },
        },
        {
          $set: {
            canReadToday: {
              $or: [
                { $literal: hasActive },
                { $lt: ["$dailyCount", FREE_DAILY_STORY_LIMIT] },
              ],
            },
          },
        },
        {
          $set: {
            totalReads: { $add: [{ $ifNull: ["$totalReads", 0] }, incrementRead ? 1 : 0] },
          },
        },
      ],
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    let metadata = result.value;
    if (!metadata) {
      metadata = {
        _id: new ObjectId(),
        userEmail,
        email: userEmail,
        totalReads: incrementRead ? 1 : 0,
        lastLogin: todayUTC(),
        dailyCount: incrementRead ? 1 : 0,
        dailyDate: today,
        subscriptionStatus: "none",
        canReadToday: hasActive || (incrementRead ? 1 : 0) < FREE_DAILY_STORY_LIMIT,
      };
    }

    return NextResponse.json({ metadata: { ...metadata, hasActiveSub: hasActive } }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[user/metadata][PATCH] failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}