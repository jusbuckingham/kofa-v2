import clientPromise from "@/lib/mongodb";

// Number of free reads per day for non-subscribers
export const FREE_READS_PER_DAY = Number(process.env.FREE_READS_PER_DAY ?? 20);

export interface QuotaResult {
  readsToday: number;
  totalReads: number;
  limit: number | null; // null when unlimited (subscriber)
  allowed: boolean;
  hasActiveSub: boolean;
}

interface UserMetaDoc {
  email: string;
  readsToday: number;
  totalReads: number;
  lastResetUTC: number; // ms at UTC midnight
  hasActiveSub?: boolean;
  stripeCustomerId?: string | null;
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

  const doc = await coll.findOne({ email });

  // Create new doc if doesn't exist
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

  // Reset if new UTC day
  const reset = doc.lastResetUTC !== todayKey;
  let readsToday = reset ? 0 : doc.readsToday ?? 0;
  let totalReads = doc.totalReads ?? 0;
  const hasActiveSub = Boolean(doc.hasActiveSub);

  // Subscribers: unlimited but still track counts
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

export async function incrementRead(email: string) {
  return upsertAndCheckQuota(email, true);
}

export async function peekQuota(email: string) {
  return upsertAndCheckQuota(email, false);
}