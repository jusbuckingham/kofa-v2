export const dynamic = "force-dynamic";
export const revalidate = 0;
// app/api/news/fetch/route.ts
import { NextResponse } from "next/server";
import { fetchNewsFromSource } from "@/lib/fetchNews";

// Minimal shape returned by lib/fetchNews
type FetchResult = {
  inserted: number;
  stories: Array<{ source?: string }>;
  debug?: {
    fetched: number;
    afterHard: number;
    afterFilters: number;
    toSummarize: number;
    inserted: number;
    modified: number;
    matched: number;
  };
};

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("Authorization")?.split(" ")[1];
  const isDev = process.env.NODE_ENV !== "production";

  // NEW: allow scheduled Vercel Cron calls in production via headers
  const vercelCronHeader =
    request.headers.get("x-vercel-cron") || request.headers.get("x-vercel-schedule");

  // In production, accept either the Vercel Cron header or the shared secret
  // Optional: allow unauthenticated dry-run reads when ALLOW_FETCH_DRYRUN_PUBLIC=1
  const urlObj = new URL(request.url);
  const sp = urlObj.searchParams;
  const allowPublicDryRun = process.env.ALLOW_FETCH_DRYRUN_PUBLIC === "1";
  if (
    !isDev &&
    !vercelCronHeader &&
    (!secret || authHeader !== secret) &&
    !(allowPublicDryRun && (sp.get("dryRun") === "1" || sp.get("dry") === "1"))
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const includeMeta = sp.get("meta") === "1" || sp.get("includeMeta") === "1";

    // Delegate ingestion to shared pipeline (handles RSS with UA, relax flags, insertion & summaries)
    const result = await fetchNewsFromSource();
    // Expected to include: { inserted, stories, debug? }
    const { inserted = 0, stories = [], debug: metaDebug } = (result as FetchResult);
    const affected = inserted + (metaDebug?.modified ?? 0);

    return NextResponse.json(
      {
        ok: true,
        inserted,
        upsertedSummaries: 0,
        count: stories.length,
        totalFetched: stories.length,
        affected,
        meta: includeMeta ? { debug: metaDebug } : undefined,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)) || "Internal Error";
    if (process.env.NEWS_DEBUG === "1" || process.env.NEWS_DEBUG === "true") {
      console.error("[api/news/fetch] failed:", msg);
    }
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}