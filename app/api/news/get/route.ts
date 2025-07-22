import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import {
  FREE_DAILY_STORY_LIMIT,
  todayUtcISO,
  isOverFreeLimit,
  SubscriptionStatus,
} from "@/lib/constants";
import type { NewsStory } from "@/app/types";
import type { WithId, ObjectId } from "mongodb";

// Ensure this route is always evaluated on the server at request time
export const dynamic = "force-dynamic";

/**
 * User metadata document as we store it (without _id – Mongo adds that).
 */
export interface UserMetadataDoc {
  userEmail: string;
  totalReads: number;
  dailyCount: number;
  dailyDate: string; // YYYY-MM-DD in UTC
  lastLogin: Date;
  subscriptionStatus: SubscriptionStatus;
}

// Helper type for a doc coming back from Mongo (it will include _id)
type UserMetaWithId = WithId<UserMetadataDoc>;

// ----- News document type from Mongo -----
type NewsMongoDoc = WithId<Partial<NewsStory> & { _id: ObjectId }>;

/**
 * GET /api/news/get?limit=5
 * Server-side enforced metered paywall + news fetch.
 * - Requires an authenticated session (401 otherwise)
 * - Resets/updates daily counters in user_metadata
 * - Blocks over-free-limit users with 402 + paywalled flag
 * - Returns normalized stories array and remaining free reads
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Sanitize limit (1–50)
  let limit = Number(searchParams.get("limit") ?? 5);
  if (!Number.isFinite(limit) || limit <= 0) limit = 5;
  if (limit > 50) limit = 50;

  // Try to get a session; don't crash if it fails (e.g. during anon/dev access)
  const session = await getServerSession(authOptions).catch(() => null);
  const anonymous = !session?.user?.email;

  // If completely anonymous, just serve stories without touching user_metadata
  // (prevents 401/402 on home when not signed in and fixes "no summaries" issue)
  if (anonymous) {
    try {
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
      const coll = db.collection<NewsMongoDoc>("summaries");

      const docs = await coll.find({}).sort({ date: -1 }).limit(limit).toArray();

      const stories: NewsStory[] = docs.map(({ _id, id, ...rest }) => {
        const normalizedId =
          typeof id === "string" || typeof id === "number" ? id : _id.toString();
        return { id: normalizedId, ...(rest as Omit<NewsStory, "id">) };
      });

      return NextResponse.json(
        {
          stories,
          remaining: FREE_DAILY_STORY_LIMIT,
          limit: FREE_DAILY_STORY_LIMIT,
          paywalled: false,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (err) {
      console.error("DB error in /api/news/get (anon branch):", err);
      return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
    }
  }

  // Logged-in user path continues below
  const email = session!.user!.email!;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || "kofa");

    // --- 1. Fetch or create metadata doc ---
    const metaCol = db.collection<UserMetadataDoc>("user_metadata");
    const today = todayUtcISO();

    let meta: UserMetaWithId | null = await metaCol.findOne({ userEmail: email });

    if (!meta) {
      const newDoc: UserMetadataDoc = {
        userEmail: email,
        totalReads: 0,
        dailyCount: 0,
        dailyDate: today,
        lastLogin: new Date(),
        subscriptionStatus: "none",
      };
      const insertRes = await metaCol.insertOne(newDoc);
      meta = { _id: insertRes.insertedId, ...newDoc };
    }

    // reset daily counters if we've crossed UTC day boundary
    if (meta.dailyDate !== today) {
      await metaCol.updateOne(
        { userEmail: email },
        { $set: { dailyDate: today, dailyCount: 0 } }
      );
      meta.dailyDate = today;
      meta.dailyCount = 0;
    }

    // --- 2. Enforce free-limit if user not subscribed ---
    const overLimit = isOverFreeLimit(meta.dailyCount, meta.subscriptionStatus);
    if (overLimit) {
      return NextResponse.json(
        {
          paywalled: true,
          remaining: 0,
          limit: FREE_DAILY_STORY_LIMIT,
        },
        { status: 402 }
      );
    }

    // --- 3. Fetch stories from Mongo ---
    const coll = db.collection<NewsMongoDoc>("summaries"); // keep your existing collection name
    const docs = await coll
      .find({})
      .sort({ date: -1 })
      .limit(limit)
      .toArray();

    // normalize _id -> id without using `any`
    const stories: NewsStory[] = docs.map((doc) => {
      const { _id, id, ...rest } = doc;
      const normalizedId = (typeof id === "string" || typeof id === "number") ? id : _id.toString();
      return { id: normalizedId, ...(rest as Omit<NewsStory, "id">) };
    });

    // --- 4. Increment counters (count this "read") ---
    await metaCol.updateOne(
      { userEmail: email },
      {
        $inc: { dailyCount: 1, totalReads: 1 },
        $set: { lastLogin: new Date() },
      }
    );

    const newDailyCount = meta.dailyCount + 1;
    const remaining = Math.max(0, FREE_DAILY_STORY_LIMIT - newDailyCount);

    return NextResponse.json(
      {
        stories,
        remaining,
        limit: FREE_DAILY_STORY_LIMIT,
        paywalled: false,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    console.error("DB error in /api/news/get:", err);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}