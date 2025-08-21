export const dynamic = "force-dynamic";
// app/api/news/fetch/route.ts
import { NextResponse } from "next/server";
import fetchNewsFromSource from "@/lib/fetchNews";
import { clientPromise } from "@/lib/mongoClient";
import { MongoBulkWriteError } from "mongodb";
import summarizeWithPerspective from "@/lib/summarize";

/** Raw shape coming back from feeds/parsers */
type IngestStory = {
  id?: string;
  url?: string;
  link?: string;
  title?: string;
  headline?: string;
  source?: string;
  publishedAt?: string | Date;
  pubDate?: string | Date;
  content?: string;
  description?: string;
  snippet?: string;
  excerpt?: string;
  imageUrl?: string;
  image?: string;
};

/** Normalized document we insert into `stories` */
interface NormalizedStory {
  id: string;
  url: string;
  title: string;
  source: string;
  publishedAt: string; // ISO
  imageUrl?: string;
  // keep original text fields for future models/debugging
  raw?: {
    content?: string;
    description?: string;
    snippet?: string;
    excerpt?: string;
  };
}

/** Bulk op for summaries upsert */
type SummaryOp = {
  updateOne: {
    filter: { id: string };
    update: { $set: Record<string, unknown> };
    upsert: boolean;
  };
};

// --- helpers ---------------------------------------------------------------
function clampBullet(s: string, max = 120): string {
  const str = (s || "").trim().replace(/\s+/g, " ");
  if (str.length <= max) return str;
  const sub = str.slice(0, max);
  const lastStop = Math.max(sub.lastIndexOf("."), sub.lastIndexOf("!"), sub.lastIndexOf("?"));
  return (lastStop > 50 ? sub.slice(0, lastStop + 1) : sub).trim();
}

async function extractOgImage(url: string): Promise<string | undefined> {
  try {
    if (!/^https?:\/\//i.test(url)) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    clearTimeout(timer);

    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("text/html")) return undefined;

    const html = await res.text();
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    if (ogMatch?.[1]) return ogMatch[1];
    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    if (twMatch?.[1]) return twMatch[1];
  } catch {
    // ignore network/parse/abort errors
  }
  return undefined;
}

function toDomain(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function toISO(value?: string | Date): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.toISOString();
}

// --- route -----------------------------------------------------------------
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("Authorization")?.split(" ")[1];

  if (!secret || authHeader !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse optional query parameters for filtering and control
  const urlObj = new URL(request.url);
  const sp = urlObj.searchParams;
  const sourceParam = sp.get("source"); // e.g. "bbc.com,nytimes.com,BBC"
  const q = sp.get("q")?.trim() || ""; // free-text match
  const fromStr = sp.get("from"); // ISO date
  const toStr = sp.get("to"); // ISO date
  const limitParam = sp.get("limit");
  const limitNum = limitParam ? Math.max(1, Math.min(1000, Number(limitParam) || 0)) : undefined; // hard cap
  const dryRun = sp.get("dryRun") === "1" || sp.get("dry") === "1"; // if true, do not write to DB
  const includeMeta = sp.get("meta") === "1"; // attach summary meta in response

  const wantedSources = sourceParam
    ? sourceParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : undefined;

  function withinRange(d?: string | Date): boolean {
    if (!fromStr && !toStr) return true;
    if (!d) return false;
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return false;
    if (fromStr && dt < new Date(fromStr)) return false;
    if (toStr && dt > new Date(toStr)) return false;
    return true;
  }

  function matchesQuery(title?: string, body?: string): boolean {
    if (!q) return true;
    try {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(safe, "i");
      return rx.test(title || "") || rx.test(body || "");
    } catch {
      return (
        (title || "").toLowerCase().includes(q.toLowerCase()) ||
        (body || "").toLowerCase().includes(q.toLowerCase())
      );
    }
  }

  const { stories } = await fetchNewsFromSource();
  // Force the loose feed shape into our local ingest type so downstream
  // filtering/normalization can reference optional fields safely.
  const fetchedRaw = stories as unknown as IngestStory[];

  // Apply in-memory filters to fetched items
  let filtered: IngestStory[] = fetchedRaw.filter((s) => {
    const url = s.url || s.link || "";
    const domain = (s.source || toDomain(url)).toLowerCase();
    const pub = s.publishedAt ?? s.pubDate;
    const title = s.title || s.headline || "";
    const body = s.content || s.description || s.snippet || s.excerpt || "";

    const sourceOk = !wantedSources || wantedSources.some((ws) => domain.includes(ws) || url.toLowerCase().includes(ws));
    const timeOk = withinRange(pub as string | Date);
    const qOk = matchesQuery(title, body);
    return sourceOk && timeOk && qOk;
  });

  // Optional hard limit of items to process
  if (typeof limitNum === "number") {
    filtered = filtered.slice(0, limitNum);
  }

  // Normalize for storage/summarization
  const normalized: NormalizedStory[] = await Promise.all(
    filtered.map(async (s) => {
      const url = s.url || s.link || "";
      const title = s.title || s.headline || "Untitled";
      const source = s.source || toDomain(url) || "";
      const publishedAt = toISO(s.publishedAt) ?? toISO(s.pubDate) ?? new Date().toISOString();
      const imageUrl = s.imageUrl || s.image || (await extractOgImage(url)) || undefined;
      const id = s.id || url; // use URL as id fallback
      return {
        id,
        url,
        title,
        source,
        publishedAt,
        imageUrl,
        raw: {
          content: s.content,
          description: s.description,
          snippet: s.snippet,
          excerpt: s.excerpt,
        },
      } satisfies NormalizedStory;
    })
  );

  // Connect to MongoDB
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB_NAME;
  const db = client.db(dbName && dbName.trim() ? dbName : undefined);
  const storiesColl = db.collection<NormalizedStory>("stories");
  const summariesColl = db.collection("summaries");

  // Ensure indexes (no-throw if already exist)
  try {
    await storiesColl.createIndex({ id: 1 }, { unique: true, background: true });
    await summariesColl.createIndex({ id: 1 }, { unique: true, background: true });
    await summariesColl.createIndex({ publishedAt: -1 }, { background: true });
  } catch {
    // ignore index races
  }

  // Short-circuit if nothing to do
  if (!normalized.length) {
    return NextResponse.json({ ok: true, inserted: 0, upsertedSummaries: 0, count: 0, totalFetched: fetchedRaw.length });
  }

  // Try to insert new stories, ignore duplicates (requires unique index on stories.id)
  let insertedCount = 0;
  if (!dryRun) {
    try {
      const result = await storiesColl.insertMany(normalized, { ordered: false });
      insertedCount = result.insertedCount;
    } catch (err) {
      type BulkErr = MongoBulkWriteError & { code?: number; result?: { nInserted?: number } };
      const bulkErr = err as BulkErr;
      if (bulkErr instanceof MongoBulkWriteError && bulkErr.code === 11000) {
        insertedCount = bulkErr.result?.nInserted ?? 0;
      } else {
        throw err;
      }
    }
  }

  // Build summaries for each story (best‑effort fields)
  const summaryOps: SummaryOp[] = await Promise.all(
    normalized.map(async (s) => {
      const body = s.raw?.content || s.raw?.description || s.raw?.snippet || s.raw?.excerpt || s.title;

      let oneLiner = "";
      let bullets: string[] = ["", "", "", ""];
      try {
        const ai = await summarizeWithPerspective(body);
        oneLiner = (ai.oneLiner || s.title).trim();
        const raw = Array.isArray(ai.bullets) ? ai.bullets : [];
        const normalizedBullets = raw.slice(0, 4);
        while (normalizedBullets.length < 4) normalizedBullets.push("");
        bullets = normalizedBullets.map((b) => clampBullet(b, 120));
      } catch {
        oneLiner = s.title;
      }

      const sources = [{ title: s.title, url: s.url, domain: toDomain(s.url) }];

      return {
        updateOne: {
          filter: { id: s.id },
          update: {
            $set: {
              id: s.id,
              title: s.title,
              url: s.url,
              source: s.source,
              publishedAt: s.publishedAt,
              imageUrl: s.imageUrl,
              oneLiner,
              bullets,
              sources,
            },
          },
          upsert: true,
        },
      } satisfies SummaryOp;
    })
  );

  // Upsert summaries in bulk (requires unique index on summaries.id)
  let upserted = 0;
  if (summaryOps.length && !dryRun) {
    try {
      const res = await summariesColl.bulkWrite(summaryOps, { ordered: false });
      upserted = (res.upsertedCount ?? 0) + (res.modifiedCount ?? 0);
    } catch (err) {
      const bulkErr = err as MongoBulkWriteError;
      if (!(bulkErr instanceof MongoBulkWriteError && bulkErr.code === 11000)) {
        throw err;
      }
    }
  }

  const distinctSources = Array.from(new Set(normalized.map((n) => n.source).filter(Boolean))).sort();
  const latestPublishedAt = normalized
    .map((n) => new Date(n.publishedAt))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return NextResponse.json({
    ok: true,
    inserted: insertedCount,
    upsertedSummaries: upserted,
    count: normalized.length,
    totalFetched: fetchedRaw.length,
    filters: {
      source: sourceParam || null,
      q: q || null,
      from: fromStr || null,
      to: toStr || null,
      limit: limitNum ?? null,
      dryRun,
    },
    meta: includeMeta
      ? {
          sources: distinctSources,
          latestPublishedAt: latestPublishedAt ? latestPublishedAt.toISOString() : null,
        }
      : undefined,
  });
}