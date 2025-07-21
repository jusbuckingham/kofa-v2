import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import type { SubscriptionStatus } from "@/lib/constants";
import {
  FREE_DAILY_STORY_LIMIT,
  isSubscribedFromStripeObjects,
  todayUtcISO,
  todayUTC,
} from "@/lib/constants";
import { authOptions } from "@/lib/auth";

import type { WithId, ObjectId } from "mongodb";

interface UserMetadataDoc {
  _id?: ObjectId;
  userEmail: string;
  totalReads: number;
  lastLogin: Date;
  dailyCount: number;
  dailyDate: string; // YYYY-MM-DD
  subscriptionStatus: SubscriptionStatus;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
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

  return NextResponse.json({ metadata: doc });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;
  const { incrementRead = false } = (await request.json()) as {
    incrementRead?: boolean;
  };

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
  const coll = db.collection<UserMetadataDoc>("user_metadata");

  const today = todayUtcISO();
  const update: Partial<UserMetadataDoc> = {};
  if (incrementRead) {
    update.totalReads = 1; // use $inc operator below
    update.lastLogin = todayUTC();
  }

  const result = await coll.findOneAndUpdate(
    { userEmail },
    [
      {
        $set: {
          dailyDate: {
            $cond: [{ $eq: ["$dailyDate", today] }, "$dailyDate", today],
          },
        },
      },
      {
        $set: {
          dailyCount: {
            $cond: [
              { $eq: ["$dailyDate", today] },
              { $add: ["$dailyCount", incrementRead ? 1 : 0] },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          canReadToday: {
            $or: [
              { $gte: ["$dailyCount", FREE_DAILY_STORY_LIMIT] },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              isSubscribedFromStripeObjects(session.user as any),
            ],
          },
        },
      },
      {
        $set: {
          totalReads: { $add: ["$totalReads", incrementRead ? 1 : 0] },
          lastLogin: todayUTC(),
        },
      },
    ],
    { returnDocument: "after" }
  );

  return NextResponse.json({ metadata: result.value });
}