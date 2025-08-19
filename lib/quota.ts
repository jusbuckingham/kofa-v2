import clientPromise from "@/lib/mongodb";

// Number of free summaries per day for non-subscribers
// Prefer FREE_SUMMARIES_PER_DAY; fall back to old FREE_READS_PER_DAY for compatibility
const _rawFreeLimit = process.env.FREE_SUMMARIES_PER_DAY ?? process.env.FREE_READS_PER_DAY;
const _parsedFreeLimit = Number(_rawFreeLimit);
export const FREE_SUMMARIES_PER_DAY = Number.isFinite(_parsedFreeLimit) ? _parsedFreeLimit : 3;
if (process.env.NODE_ENV === "development" && _rawFreeLimit !== undefined && !Number.isFinite(_parsedFreeLimit)) {
  console.warn("[quota] Invalid FREE_SUMMARIES_PER_DAY='" + _rawFreeLimit + "' — defaulting to 3");
}

export interface QuotaResult {
  // New canonical fields
  summariesToday: number;
  totalSummaries: number;
  limit: number | null; // null when unlimited (subscriber)
  allowed: boolean;
  hasActiveSub: boolean;
  // Back-compat mirrors (deprecated): retained so existing callers don’t break
  /** @deprecated use summariesToday */
  readsToday?: number;
  /** @deprecated use totalSummaries */
  totalReads?: number;
}

interface UserMetaDoc {
  email: string;
  // New fields
  summariesViewedToday?: number;
  summariesTotal?: number;
  lastResetUTC: number; // ms at UTC midnight
  hasActiveSub?: boolean;
  stripeCustomerId?: string | null;
  // Legacy fields for migration support
  readsToday?: number;
  totalReads?: number;
}

function startOfUTCday(d: Date = new Date()): number {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy.getTime();
}

async function upsertAndCheckSummaryQuota(email: string, increment: boolean): Promise<QuotaResult> {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection<UserMetaDoc>("user_metadata");

  const keyEmail = email.trim().toLowerCase();

  const todayKey = startOfUTCday();

  const doc = await coll.findOne({ email: keyEmail });

  // If no document exists, create a fresh one
  if (!doc) {
    const summariesToday = increment ? 1 : 0;
    const totalSummaries = increment ? 1 : 0;
    const hasActiveSub = false;

    await coll.insertOne({
      email: keyEmail,
      summariesViewedToday: summariesToday,
      summariesTotal: totalSummaries,
      lastResetUTC: todayKey,
      hasActiveSub,
    });

    return {
      summariesToday,
      totalSummaries,
      limit: FREE_SUMMARIES_PER_DAY,
      allowed: summariesToday <= FREE_SUMMARIES_PER_DAY,
      hasActiveSub,
      // back-compat mirrors
      readsToday: summariesToday,
      totalReads: totalSummaries,
    };
  }

  // Handle UTC day rollover
  const reset = doc.lastResetUTC !== todayKey;

  // Migrate legacy fields if present
  let summariesToday = reset ? 0 : (doc.summariesViewedToday ?? doc.readsToday ?? 0);
  let totalSummaries = doc.summariesTotal ?? doc.totalReads ?? 0;
  const hasActiveSub = Boolean(doc.hasActiveSub);

  // Subscribers: unlimited, but still track counters
  if (hasActiveSub) {
    if (increment) {
      await coll.updateOne(
        { email: keyEmail },
        {
          $set: { lastResetUTC: todayKey },
          $inc: { summariesViewedToday: 1, summariesTotal: 1 },
        }
      );
      summariesToday += 1;
      totalSummaries += 1;
    } else if (reset) {
      await coll.updateOne(
        { email: keyEmail },
        { $set: { lastResetUTC: todayKey, summariesViewedToday: summariesToday, summariesTotal: totalSummaries } }
      );
    }

    return {
      summariesToday,
      totalSummaries,
      limit: null,
      allowed: true,
      hasActiveSub,
      // back-compat
      readsToday: summariesToday,
      totalReads: totalSummaries,
    };
  }

  // Non-subscriber flow
  const projected = increment ? summariesToday + 1 : summariesToday;
  const allowed = projected <= FREE_SUMMARIES_PER_DAY;

  if (increment && allowed) {
    await coll.updateOne(
      { email: keyEmail },
      {
        $set: { lastResetUTC: todayKey },
        $inc: { summariesViewedToday: 1, summariesTotal: 1 },
      }
    );
    summariesToday = projected;
    totalSummaries += 1;
  } else if (reset) {
    await coll.updateOne(
      { email: keyEmail },
      { $set: { lastResetUTC: todayKey, summariesViewedToday: summariesToday, summariesTotal: totalSummaries } }
    );
  }

  return {
    summariesToday,
    totalSummaries,
    limit: FREE_SUMMARIES_PER_DAY,
    allowed,
    hasActiveSub,
    // back-compat mirrors
    readsToday: summariesToday,
    totalReads: totalSummaries,
  };
}

// New canonical APIs
export async function incrementSummaryView(email: string) {
  return upsertAndCheckSummaryQuota(email, true);
}

export async function peekSummaryQuota(email: string) {
  return upsertAndCheckSummaryQuota(email, false);
}

// Backwards-compatible aliases (deprecated)
/** @deprecated use incrementSummaryView */
export async function incrementRead(email: string) {
  return incrementSummaryView(email);
}

/** @deprecated use peekSummaryQuota */
export async function peekQuota(email: string) {
  return peekSummaryQuota(email);
}