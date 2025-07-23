// app/api/user/read/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import clientPromise from "@/lib/mongodb";
import type { ObjectId } from "mongodb";

const FREE_READS_PER_DAY = 3;

export interface UserMetaDoc {
  _id?: ObjectId;
  email: string;
  readsToday: number;
  totalReads: number;
  lastResetUTC: number; // ms at UTC 00:00
  hasActiveSub?: boolean;
}

interface QuotaResult {
  readsToday: number;
  totalReads: number;
  limit: number | null; // null when unlimited (subscriber)
  allowed: boolean;
  hasActiveSub: boolean;
}

function startOfUTCday(d: Date = new Date()): number {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy.getTime();
}

async function upsertAndCheckQuota(email: string, increment: boolean): Promise<QuotaResult> {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection<UserMetaDoc>("user_metadata");

  const todayKey = startOfUTCday();

  // Fetch doc once
  const doc = await coll.findOne({ email });

  // If no doc yet, insert a fresh one
  if (!doc) {
    const readsToday = increment ? 1 : 0;
    const totalReads = increment ? 1 : 0;
    const hasActiveSub = false;

    await coll.insertOne({
      email,
      readsToday,
      totalReads,
      lastResetUTC: todayKey,
      hasActiveSub,
    });

    return {
      readsToday,
      totalReads,
      limit: FREE_READS_PER_DAY,
      allowed: readsToday <= FREE_READS_PER_DAY,
      hasActiveSub,
    };
  }

  // Determine if the daily counter needs a reset
  const reset = doc.lastResetUTC !== todayKey;
  let readsToday = reset ? 0 : doc.readsToday ?? 0;
  let totalReads = doc.totalReads ?? 0;
  const hasActiveSub = !!doc.hasActiveSub;

  // Subscribers: unlimited (still increment for analytics)
  if (hasActiveSub) {
    if (increment) {
      await coll.updateOne(
        { email },
        {
          $set: { lastResetUTC: todayKey },
          $inc: { readsToday: 1, totalReads: 1 },
        }
      );
      readsToday += 1;
      totalReads += 1;
    } else if (reset) {
      // Persist reset if we didn't increment
      await coll.updateOne(
        { email },
        { $set: { lastResetUTC: todayKey, readsToday, totalReads } }
      );
    }

    return {
      readsToday,
      totalReads,
      limit: null,
      allowed: true,
      hasActiveSub,
    };
  }

  // Non-subscriber flow
  const projectedReads = increment ? readsToday + 1 : readsToday;
  const allowed = projectedReads <= FREE_READS_PER_DAY;

  if (increment && allowed) {
    await coll.updateOne(
      { email },
      {
        $set: { lastResetUTC: todayKey },
        $inc: { readsToday: 1, totalReads: 1 },
      }
    );
    readsToday = projectedReads;
    totalReads += 1;
  } else if (reset) {
    // Persist the reset even if we didn't increment or were not allowed
    await coll.updateOne(
      { email },
      { $set: { lastResetUTC: todayKey, readsToday, totalReads } }
    );
  }

  return {
    readsToday,
    totalReads,
    limit: FREE_READS_PER_DAY,
    allowed,
    hasActiveSub,
  };
}

// Convenience helper for other server routes to record a read atomically
export async function incrementReadServer(email: string) {
  return upsertAndCheckQuota(email, true);
}

// GET = just check quota
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await upsertAndCheckQuota(token.email, false);
  return NextResponse.json(res);
}

// POST = increment (call when a story is actually opened)
export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let increment = true;
  try {
    const body: unknown = await req.json().catch(() => ({}));
    if (
      typeof body === "object" &&
      body !== null &&
      "increment" in body &&
      typeof (body as { increment: unknown }).increment === "boolean"
    ) {
      increment = (body as { increment: boolean }).increment;
    }
  } catch {
    // ignore malformed JSON; keep default increment=true
  }

  const res = await upsertAndCheckQuota(token.email, increment);

  if (!res.allowed) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        message: `Free quota of ${FREE_READS_PER_DAY} reads per day reached.`,
        ...res,
      },
      { status: 402 }
    );
  }

  return NextResponse.json(res);
}