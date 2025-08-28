import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Parse query params first so we can allow a safe env view even in prod
  const stage = req.nextUrl.searchParams.get("stage") || "";

  // Safe env presence view (allowed in prod): shows only presence and a small sample
  if (stage === "env") {
    const raw = process.env.FEED_URLS || "";
    const feeds = raw.split(",").map((s) => s.trim()).filter((s) => /^https?:/i.test(s));

    const present = {
      FEED_URLS: feeds.length > 0,
      OPENAI_API_KEY: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0),
      NEWS_RELAX: process.env.NEWS_RELAX,
      NEWS_MIN_LEN: process.env.NEWS_MIN_LEN,
      NEWS_MIN_LEN_TRUSTED: process.env.NEWS_MIN_LEN_TRUSTED,
      NEWS_MAX_TO_SUMMARIZE: process.env.NEWS_MAX_TO_SUMMARIZE,
      NEWS_DEBUG: process.env.NEWS_DEBUG,
    } as const;

    return NextResponse.json(
      { ok: true, present, feedCount: feeds.length, feedsSample: feeds.slice(0, 5) },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Only allow other debug stages in non-prod or when explicitly enabled
  const nodeEnv = (process.env.NODE_ENV || "development") as "development" | "production" | "test";
  const debugEnabled = nodeEnv !== "production" || process.env.DEBUG_ENABLE === "true";

  if (!debugEnabled) {
    return NextResponse.json(
      { ok: false, error: "Not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const keys = [
    // Core
    "MONGODB_URI",
    "MONGODB_DB_NAME",
    // OpenAI / summarization
    "OPENAI_API_KEY",
    "MAX_TO_SUMMARIZE",
    "SUMMARY_MODEL",
    "SUMMARY_FALLBACK_MODEL",
    // News ingestion & ranking
    "FEED_URLS",
    "NEWS_LENS",
    "NEWS_MIN_SCORE",
    "NEWS_ALLOWLIST_ONLY",
    "NEWS_BLACK_DOMAIN_BOOST",
    // Cron/auth
    "CRON_SECRET",
    "ALLOW_FETCH_DRYRUN_PUBLIC",
    // Public site / auth
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_DEFAULT_LENS",
    "NEXTAUTH_URL",
    "NEXTAUTH_SECRET",
  ];

  const present: Record<string, boolean> = {};
  for (const k of keys) {
    present[k] = !!process.env[k] && String(process.env[k]!).trim().length > 0;
  }

  // Provide safe, non-sensitive hints
  const feedUrls = (process.env.FEED_URLS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const hints = {
    feedCount: feedUrls.length,
    hasTrustedDefaultLens: (process.env.NEXT_PUBLIC_DEFAULT_LENS || "").length > 0,
  };

  return NextResponse.json(
    {
      ok: true,
      env: nodeEnv,
      present,
      hints,
      note:
        "Values are not shown here. 'present' only indicates whether each variable is set."
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}