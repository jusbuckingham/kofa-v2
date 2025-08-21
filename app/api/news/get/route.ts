// app/api/news/get/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse, NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { Filter, Document } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { peekSummaryQuota } from "@/lib/quota";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? "7");
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 7; // clamp 1..50

  const offsetParam = searchParams.get("offset");
  const pageParam = searchParams.get("page");
  const parsedOffset = offsetParam !== null ? Number(offsetParam) : NaN;
  const parsedPage = pageParam !== null ? Number(pageParam) : NaN;
  const offset = Number.isFinite(parsedOffset)
    ? Math.max(parsedOffset, 0)
    : Number.isFinite(parsedPage)
      ? Math.max(parsedPage, 0) * limit
      : 0;

  // Optional filters: source list, free-text query, date range, and sort
  const sourceParam = searchParams.get("source"); // e.g. "BBC,NYTimes"
  const q           = searchParams.get("q")?.trim() || ""; // free-text
  const fromStr     = searchParams.get("from");     // ISO date string
  const toStr       = searchParams.get("to");       // ISO date string
  const sortParam   = searchParams.get("sort") || "-publishedAt"; // "-publishedAt" | "publishedAt"

  // Helper to derive a domain from a URL
  const toDomain = (u: string | undefined): string | null => {
    if (!u) return null;
    try {
      const d = new URL(u).hostname.replace(/^www\./, "");
      return d.toLowerCase();
    } catch {
      return null;
    }
  };

  // Build MongoDB filter
  const filter: Filter<Document> = {};

  // Optional: explicit domain filter (e.g. domain=bbc.co.uk,nytimes.com)
  const domainParam = searchParams.get("domain");

  if (sourceParam) {
    const list = sourceParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length) filter.source = { $in: list };
  }

  if (domainParam) {
    const domains = domainParam
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (domains.length) {
      const existingOr = (filter as Document).$or as Document[] | undefined;
      const domainRegexes = domains.map(
        (d) => new RegExp(d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      );
      const orArr: Document[] = [
        { source: { $in: domains } } as Document,
        { url: { $in: domainRegexes } } as Document,
      ];
      (filter as Document).$or = [...(existingOr ?? []), ...orArr];
    }
  }

  if (fromStr || toStr) {
    const range: Record<string, Date> = {};
    if (fromStr) range.$gte = new Date(fromStr);
    if (toStr)   range.$lte = new Date(toStr);
    filter.publishedAt = range;
  }

  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    const orArr: Document[] = [
      { title: rx },
      { oneLiner: rx },
      { colorNote: rx },
      { bullets: { $elemMatch: { $regex: rx } } },
    ];
    if ((filter as Document).$or && Array.isArray((filter as Document).$or)) {
      (filter as Document).$or = [...(filter as Document).$or as Document[], ...orArr];
    } else {
      (filter as Document).$or = orArr;
    }
  }

  // Determine sort
  const sort: Record<string, 1 | -1> = sortParam === "publishedAt" ? { publishedAt: 1 } : { publishedAt: -1 };

  const client = await clientPromise;
  const db     = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const col    = db.collection("summaries");

  const total = await col.countDocuments(filter);
  // fetch raw documents matching filters
  const docs = await col
    .find(filter)
    .sort(sort)
    .skip(offset)
    .limit(limit)
    .toArray();

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  let quotaInfo = null;
  if (email) {
    quotaInfo = await peekSummaryQuota(email);
  }

  const stories = docs.map((doc) => {
    const locked =
      quotaInfo && !quotaInfo.hasActiveSub &&
      quotaInfo.summariesToday >= (quotaInfo.limit ?? 0);

    const pubISO = doc.publishedAt instanceof Date
      ? doc.publishedAt.toISOString()
      : typeof doc.publishedAt === "string"
        ? doc.publishedAt
        : null;

    const resolvedSources = Array.isArray(doc.sources) ? doc.sources : [];

    return {
      id: doc.id || doc._id.toString(),
      title: doc.title,
      url: doc.url,
      imageUrl: doc.imageUrl,
      source: doc.source ?? toDomain(doc.url || undefined) ?? "",
      publishedAt: pubISO ?? new Date().toISOString(),
      oneLiner: doc.oneLiner,
      bullets: doc.bullets,
      colorNote: doc.colorNote,
      sources: resolvedSources,
      locked,
    };
  });

  const hasMore = offset + stories.length < total;

  // Optional metadata: only computed if explicitly requested via `meta=1`
  let meta: Record<string, unknown> | undefined;
  if (searchParams.get("meta") === "1") {
    const distinctSources = await col.distinct("source", filter);
    const latestDoc = await col.find(filter).sort({ publishedAt: -1 }).limit(1).toArray();
    meta = {
      sources: distinctSources, // e.g., ["BBC", "NYTimes", ...]
      latestPublishedAt: latestDoc[0]?.publishedAt instanceof Date
        ? latestDoc[0].publishedAt.toISOString()
        : latestDoc[0]?.publishedAt ?? null,
    };
  }

  return NextResponse.json({
    ok: true,
    stories,
    total,
    hasMore,
    limit,
    offset,
    filters: {
      source: sourceParam || null,
      q: q || null,
      from: fromStr || null,
      to: toStr || null,
      sort: sortParam,
    },
    meta,
    quota: quotaInfo,
  }, { status: 200 });
}