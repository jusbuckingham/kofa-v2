// app/api/news/get/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse, NextRequest } from "next/server";
import { clientPromise } from "@/lib/mongoClient";
import type { Filter, Document } from "mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { peekSummaryQuota } from "@/lib/quota";

type SummaryDoc = {
  _id: { toString(): string };
  id?: string;
  title: string;
  url?: string;
  imageUrl?: string;
  source?: string;
  publishedAt?: Date | string;
  oneLiner?: string;
  bullets?: string[]; // normalized array of bullet strings
  colorNote?: string;
  sources?: Array<{ title?: string; domain?: string; url?: string }>; // normalized source refs
};

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
  const sortParam = (searchParams.get("sort") || "-publishedAt").trim(); // "-publishedAt" | "publishedAt"

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
    const fromDate = fromStr ? new Date(fromStr) : null;
    const toDate = toStr ? new Date(toStr) : null;
    if (fromDate && !isNaN(fromDate.getTime())) range.$gte = fromDate;
    if (toDate && !isNaN(toDate.getTime())) range.$lte = toDate;
    if (range.$gte && range.$lte && range.$gte > range.$lte) {
      // swap if user passed reversed dates
      const tmp = range.$gte;
      range.$gte = range.$lte;
      range.$lte = tmp;
    }
    if (Object.keys(range).length) {
      filter.publishedAt = range;
    }
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

  // Determine sort (newest first by default). We'll compute a coerced date sort key in aggregation.
  const orderParam = (searchParams.get("order") || "").toLowerCase();
  // Newest-first unless caller explicitly asks for oldest
  // Accept: sort=oldest | sort=publishedAt | sort=asc | order=asc to flip to ascending
  const sortNewestFirst = !(
    sortParam === "publishedAt" ||
    sortParam === "oldest" ||
    sortParam === "asc" ||
    orderParam === "asc"
  );

  const client = await clientPromise;
  const db     = client.db(process.env.MONGODB_DB_NAME || process.env.MONGODB_DB || "kofa");

  // NOTE: Recommended indexes for performance at scale (create once via migration):
  // db.stories.createIndex({ publishedAt: -1 })
  // db.stories.createIndex({ source: 1 })
  // db.stories.createIndex({ url: 1 }, { unique: true })
  // Optional for q-search patterns:
  // db.stories.createIndex({ title: "text", oneLiner: "text" })

  const col    = db.collection("stories");

  const total = await col.countDocuments(filter);

  // Use aggregation to coerce mixed-type publishedAt into a real date for sorting
  const pipeline: Document[] = [
    { $match: filter },
    {
      $addFields: {
        _pubDate: {
          $let: {
            vars: { pa: "$publishedAt", ca: "$createdAt" },
            in: {
              $cond: [
                { $eq: [ { $type: "$$pa" }, "date" ] },
                "$$pa",
                {
                  $cond: [
                    { $eq: [ { $type: "$$pa" }, "string" ] },
                    {
                      $dateFromString: {
                        dateString: "$$pa",
                        onError: { $ifNull: [ "$$ca", new Date(0) ] },
                        onNull: { $ifNull: [ "$$ca", new Date(0) ] },
                      }
                    },
                    { $ifNull: [ "$$ca", new Date(0) ] }
                  ]
                }
              ]
            }
          }
        }
      }
    },
    { $sort: { _pubDate: sortNewestFirst ? -1 : 1, _id: -1 } },
    { $skip: offset },
    { $limit: limit },
    {
      $project: {
        id: 1,
        title: 1,
        url: 1,
        imageUrl: 1,
        source: 1,
        publishedAt: 1,
        oneLiner: 1,
        bullets: 1,
        colorNote: 1,
        sources: 1,
      }
    }
  ];

  const docs = (await col.aggregate<SummaryDoc>(pipeline).toArray()) as SummaryDoc[];

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

    const bulletsArr = Array.isArray(doc.bullets)
      ? (doc.bullets as unknown[]).map((b) => String(b)).filter(Boolean)
      : [];

    const resolvedSources = Array.isArray(doc.sources)
      ? (doc.sources as unknown[]).map((s) => {
          if (s && typeof s === "object") {
            const o = s as Record<string, unknown>;
            return {
              title: String(o.title ?? ""),
              domain: String(o.domain ?? ""),
              url: String(o.url ?? ""),
            };
          }
          return { title: String(s ?? ""), domain: "", url: "" };
        })
      : [];

    return {
      id: doc.id || doc._id.toString(),
      title: doc.title,
      url: doc.url,
      imageUrl: doc.imageUrl,
      source: doc.source ?? toDomain(doc.url || undefined) ?? "",
      publishedAt: pubISO ?? new Date().toISOString(),
      oneLiner: doc.oneLiner,
      bullets: bulletsArr,
      colorNote: doc.colorNote,
      sources: resolvedSources,
      locked,
    };
  });

  const hasMore = offset + stories.length < total;

  // Optional metadata: computed only when explicitly requested via `meta=1` or `includeMeta=1`
  let meta: Record<string, unknown> | undefined;
  const includeMeta = searchParams.get("meta") === "1" || searchParams.get("includeMeta") === "1";
  if (includeMeta) {
    const distinctSources = await col.distinct("source", filter);
    const latestDoc = await col.aggregate([
      { $match: filter },
      { $addFields: { _pubDate: {
        $let: {
          vars: { pa: "$publishedAt", ca: "$createdAt" },
          in: {
            $cond: [
              { $eq: [ { $type: "$$pa" }, "date" ] },
              "$$pa",
              {
                $cond: [
                  { $eq: [ { $type: "$$pa" }, "string" ] },
                  {
                    $dateFromString: {
                      dateString: "$$pa",
                      onError: { $ifNull: [ "$$ca", new Date(0) ] },
                      onNull: { $ifNull: [ "$$ca", new Date(0) ] },
                    }
                  },
                  { $ifNull: [ "$$ca", new Date(0) ] }
                ]
              }
            ]
          }
        }
      } } },
      { $sort: { _pubDate: -1 } },
      { $limit: 1 },
      { $project: { publishedAt: 1 } }
    ]).toArray();
    const sample = docs.slice(0, 3).map((d) => ({
      id: d.id || d._id.toString(),
      publishedAt: d.publishedAt,
    }));
    meta = {
      sources: distinctSources, // e.g., ["BBC", "NYTimes", ...]
      latestPublishedAt: latestDoc[0]?.publishedAt instanceof Date
        ? latestDoc[0].publishedAt.toISOString()
        : latestDoc[0]?.publishedAt ?? null,
      ordering: {
        newestFirst: sortNewestFirst,
        sample,
      },
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
  }, { status: 200, headers: { "Cache-Control": "no-store" } });
}