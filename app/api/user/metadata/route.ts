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
  totalReads: number;
  lastLogin: Date;
  dailyCount: number;
  dailyDate: string; // YYYY-MM-DD
  subscriptionStatus: SubscriptionStatus;
  canReadToday?: boolean;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const userEmail = session.user.email;
    const db = await getDb();
    const coll = db.collection<UserMetadataDoc>("user_metadata");

    let doc: WithId<UserMetadataDoc> | null = await coll.findOne({ userEmail });
    if (!doc) {
      const newDoc: UserMetadataDoc = {
        userEmail,
        totalReads: 0,
        lastLogin: todayUTC(),
        dailyCount: 0,
        dailyDate: todayUtcISO(),
        subscriptionStatus: "none",
      };
      const insertResult = await coll.insertOne(newDoc);
      doc = { _id: insertResult.insertedId, ...newDoc };
    }

    return NextResponse.json({ metadata: doc }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    const userEmail = session.user.email;
    const { incrementRead = false } = (await request.json()) as {
      incrementRead?: boolean;
    };

    const db = await getDb();
    const coll = db.collection<UserMetadataDoc>("user_metadata");

    const today = todayUtcISO();
    const hasActiveSub = Boolean(session.user.hasActiveSub);
    const result = await coll.findOneAndUpdate(
      { userEmail },
      [
        // On first write or subsequent writes, ensure essential fields exist
        {
          $set: {
            userEmail,
            // If dailyDate matches today keep it, otherwise set to today (handles undefined/null)
            dailyDate: {
              $cond: [{ $eq: ["$dailyDate", today] }, "$dailyDate", today],
            },
            // Ensure subscriptionStatus has a default
            subscriptionStatus: { $ifNull: ["$subscriptionStatus", "none"] },
            lastLogin: todayUTC(),
          },
        },
        {
          $set: {
            // If still same day, add 1 (or 0) to existing count (default 0). Otherwise start at 1 (or 0)
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
          // canReadToday = subscribed OR (dailyCount < FREE_DAILY_STORY_LIMIT)
          $set: {
            canReadToday: {
              $or: [
                { $literal: hasActiveSub },
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
      // fallback: construct sensible defaults
      metadata = {
        _id: new ObjectId(),
        userEmail,
        totalReads: incrementRead ? 1 : 0,
        lastLogin: todayUTC(),
        dailyCount: incrementRead ? 1 : 0,
        dailyDate: today,
        subscriptionStatus: "none",
        canReadToday: hasActiveSub || (incrementRead ? 1 : 0) < FREE_DAILY_STORY_LIMIT,
      };
    }

    return NextResponse.json({ metadata }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}