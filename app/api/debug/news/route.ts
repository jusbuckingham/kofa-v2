import { NextResponse } from "next/server";

export async function GET() {
  // Only allow in non-prod or when explicitly enabled
  const nodeEnv = (process.env.NODE_ENV || "development") as
    | "development"
    | "production"
    | "test";
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