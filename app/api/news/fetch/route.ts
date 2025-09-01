export const dynamic = "force-dynamic";
export const revalidate = 0;
// app/api/news/fetch/route.ts
import { NextResponse } from "next/server";
import { fetchNewsFromSource } from "@/lib/fetchNews";

// Types for items returned by lib/fetchNews
interface StoryShape {
  source?: string;
  publishedAt?: string | Date | null;
  pubDate?: string | Date | null;
  date?: string | Date | null;
  createdAt?: string | Date | null;
}

// Local helpers to ensure consistent newest-first ordering in debug/meta
function normalizeDate(x: StoryShape | null | undefined): number {
  const raw = x?.publishedAt ?? x?.pubDate ?? x?.date ?? x?.createdAt;
  if (!raw) return 0;
  const t = new Date(raw as string | Date).getTime();
  return Number.isFinite(t) ? t : 0;
}

function sortNewestFirst<T extends StoryShape>(items: T[]): T[] {
  return [...items].sort((a, b) => normalizeDate(b) - normalizeDate(a));
}

// Minimal shape returned by lib/fetchNews
type FetchResult = {
  inserted: number;
  stories: StoryShape[];
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

    const limitParam = sp.get("limit");
    const limit = limitParam ? Math.max(1, Math.min(1000, Number(limitParam))) : undefined;

    // Delegate ingestion to shared pipeline (handles RSS with UA, relax flags, insertion & summaries)
    const result = await fetchNewsFromSource();
    // Expected to include: { inserted, stories, debug? }
    const { inserted = 0, stories = [], debug: metaDebug } = result as FetchResult;

    // Ensure newest-first ordering in the response meta to help verify chronology
    const ordered: StoryShape[] = sortNewestFirst(stories || []);
    const sliced: StoryShape[] = typeof limit === "number" ? ordered.slice(0, limit) : ordered;

    const affected = inserted + (metaDebug?.modified ?? 0);

    // Build a small preview of timestamps to quickly inspect ordering when includeMeta is on
    const preview = sliced.slice(0, 5).map((s: StoryShape) => ({
      source: s.source,
      publishedAt: s.publishedAt ?? s.pubDate ?? s.date ?? s.createdAt ?? null,
      _t: normalizeDate(s),
    }));

    return NextResponse.json(
      {
        ok: true,
        inserted,
        upsertedSummaries: 0,
        count: sliced.length,
        totalFetched: Array.isArray(stories) ? stories.length : 0,
        affected,
        meta: includeMeta
          ? {
              debug: metaDebug,
              ordering: {
                applied: "publishedAt(desc) | createdAt(desc) (fallback)",
                sample: preview,
              },
            }
          : undefined,
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