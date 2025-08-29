import { getDb } from "@/lib/mongoClient";
import { FREE_DAILY_STORY_LIMIT } from "@/lib/constants";
import type { ObjectId } from "mongodb";

// Canonical limit comes from centralized constants
export const FREE_SUMMARIES_PER_DAY = FREE_DAILY_STORY_LIMIT;

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
  _id?: ObjectId;
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

async function applyUpdate(
  coll: { updateOne: (filter: { email: string }, update: Record<string, unknown>) => Promise<unknown> },
  email: string,
  update: Record<string, unknown>
) {
  await coll.updateOne({ email }, update);
}

async function upsertAndCheckSummaryQuota(email: string, increment: boolean): Promise<QuotaResult> {
  const db = await getDb();
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
      readsToday: summariesToday,
      totalReads: totalSummaries,
    };
  }

  // Handle UTC day rollover — always zero today's counter at rollover
  const reset = doc.lastResetUTC !== todayKey;

  // Migrate legacy fields if present
  let summariesTodayBase = doc.summariesViewedToday ?? doc.readsToday ?? 0;
  if (reset) summariesTodayBase = 0; // new day
  let totalSummaries = doc.summariesTotal ?? doc.totalReads ?? 0;
  const hasActiveSub = Boolean(doc.hasActiveSub);

  // Persist reset if needed
  if (reset) {
    await applyUpdate(coll, keyEmail, {
      $set: { lastResetUTC: todayKey, summariesViewedToday: summariesTodayBase, summariesTotal: totalSummaries },
    });
  }

  // Subscribers: unlimited, but still track counters
  if (hasActiveSub) {
    if (increment) {
      await applyUpdate(coll, keyEmail, {
        $inc: { summariesViewedToday: 1, summariesTotal: 1 },
      });
      summariesTodayBase += 1;
      totalSummaries += 1;
    }

    return {
      summariesToday: summariesTodayBase,
      totalSummaries,
      limit: null,
      allowed: true,
      hasActiveSub,
      readsToday: summariesTodayBase,
      totalReads: totalSummaries,
    };
  }

  // Non-subscriber flow
  const projected = increment ? summariesTodayBase + 1 : summariesTodayBase;
  const allowed = projected <= FREE_SUMMARIES_PER_DAY;

  if (increment && allowed) {
    await applyUpdate(coll, keyEmail, {
      $inc: { summariesViewedToday: 1, summariesTotal: 1 },
    });
    summariesTodayBase = projected;
    totalSummaries += 1;
  }

  return {
    summariesToday: summariesTodayBase,
    totalSummaries,
    limit: FREE_SUMMARIES_PER_DAY,
    allowed,
    hasActiveSub,
    readsToday: summariesTodayBase,
    totalReads: totalSummaries,
  };
}

// New canonical APIs
export async function incrementSummaryView(email: string): Promise<QuotaResult> {
  return upsertAndCheckSummaryQuota(email, true);
}

export async function peekSummaryQuota(email: string): Promise<QuotaResult> {
  return upsertAndCheckSummaryQuota(email, false);
}

// Backwards-compatible aliases (deprecated)
/** @deprecated use incrementSummaryView */
export async function incrementRead(email: string): Promise<QuotaResult> {
  return incrementSummaryView(email);
}

/** @deprecated use peekSummaryQuota */
export async function peekQuota(email: string): Promise<QuotaResult> {
  return peekSummaryQuota(email);
}