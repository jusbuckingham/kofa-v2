/**
 * lib/fetchNews.ts
 * Aggregates news from external providers (NewsData → fallback GNews),
 * summarizes with Kofa's perspective, and stores in MongoDB.
 */

import clientPromise from "@/lib/mongodb";
import summarizeWithPerspective from "@/lib/summarize";
import { fetchNewsData } from "@/lib/providers/newsdata";
import { fetchGNews } from "@/lib/providers/gnews";

// ---------- Helpers ----------
function getDomain(u?: string): string {
  try {
    return u ? new URL(u).hostname.replace(/^www\./, "") : "";
  } catch {
    return "";
  }
}

/** Normalize URLs for dedupe: strip hash and common tracking params */
function normalizeUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    u.hash = "";
    const params = u.searchParams;
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "utm_name",
      "utm_id",
      "utm_creative",
      "gclid",
      "fbclid",
      "mc_cid",
      "mc_eid",
    ].forEach((k) => params.delete(k));
    u.search = params.toString() ? `?${params.toString()}` : "";
    return u.toString();
  } catch {
    return raw || undefined;
  }
}

/** Ensure ≤ max chars, tweety style */
function enforceLen(input: unknown, max = 120): string {
  if (!input || typeof input !== "string") return "";
  const s = input.trim();
  return s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s;
}

// ---------- Types saved to Mongo ----------
export interface StoryDoc {
  title: string;
  url: string;
  summary: {
    oneLiner: string;
    bullets: string[]; // exactly 4 strings, each ≤ 120 chars
  };
  publishedAt: Date;
  createdAt: Date;
  imageUrl?: string;
  source: string; // domain (e.g., bbc.co.uk)
  sources: Array<{ title: string; url: string; domain: string }>;
}

// ---------- Core fetcher ----------

/**
 * Fetch from NewsData first; if it fails or returns nothing, fall back to GNews.
 * Then summarize + store new stories.
 */
export async function fetchNewsFromSource(): Promise<{ inserted: number; stories: StoryDoc[] }> {
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB_NAME ?? process.env.mongodb_db_name ?? "kofa";
  const db = client.db(dbName);
  const storiesCol = db.collection<StoryDoc>("stories");

  const seen = new Set<string>();
  const candidates: Array<{
    title: string;
    url: string;
    description: string;
    publishedAt?: string;
    imageUrl?: string;
  }> = [];

  // 1) Primary: NewsData.io
  try {
    const nd = await fetchNewsData({
      q: process.env.NEWS_QUERY || undefined,
      lang: "en",
      from: undefined,
      to: undefined,
    });
    for (const a of nd) {
      const art = a as unknown as { title?: string; url?: string; description?: string; content?: string; snippet?: string; summary?: string; publishedAt?: string; imageUrl?: string };
      const url = normalizeUrl(art.url);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      candidates.push({
        title: art.title ?? "Untitled",
        url,
        description: art.description ?? art.content ?? art.snippet ?? art.summary ?? "",
        publishedAt: art.publishedAt,
        imageUrl: art.imageUrl,
      });
    }
  } catch {
    // fall through to GNews
  }

  // 2) Fallback: GNews (only if primary yielded nothing)
  if (candidates.length === 0) {
    try {
      const g = await fetchGNews({
        q: process.env.NEWS_QUERY || undefined,
        lang: "en",
      });
      for (const a of g) {
        const art = a as unknown as { title?: string; url?: string; description?: string; content?: string; snippet?: string; summary?: string; publishedAt?: string; imageUrl?: string };
        const url = normalizeUrl(art.url);
        if (!url || seen.has(url)) continue;
        seen.add(url);
        candidates.push({
          title: art.title ?? "Untitled",
          url,
          description: art.description ?? art.content ?? art.snippet ?? art.summary ?? "",
          publishedAt: art.publishedAt,
          imageUrl: art.imageUrl,
        });
      }
    } catch {
      // still nothing—return gracefully
    }
  }

  if (candidates.length === 0) {
    return { inserted: 0, stories: [] };
  }

  // De-dupe against DB and summarize
  const toInsert: StoryDoc[] = [];
  for (const c of candidates) {
    // Skip if already ingested
    const exists = await storiesCol.findOne({ url: c.url });
    if (exists) continue;

    const textToSummarize = `${c.title ?? ""}\n\n${c.description ?? ""}`.trim();
    const s = await summarizeWithPerspective(textToSummarize);

    const summary = {
      oneLiner: enforceLen(s.oneLiner),
      bullets: (() => {
        const arr = Array.isArray(s.bullets) ? s.bullets : [];
        const four = arr.slice(0, 4).map((b) => enforceLen(b));
        while (four.length < 4) four.push("");
        return four;
      })(),
    };

    const doc: StoryDoc = {
      title: c.title ?? "Untitled",
      url: c.url,
      summary,
      publishedAt: c.publishedAt ? new Date(c.publishedAt) : new Date(),
      createdAt: new Date(),
      imageUrl: c.imageUrl,
      source: getDomain(c.url),
      sources: [
        {
          title: c.title ?? "Source",
          url: c.url,
          domain: getDomain(c.url),
        },
      ],
    };

    toInsert.push(doc);
  }

  let inserted = 0;
  const insertedDocs: StoryDoc[] = [];

  if (toInsert.length) {
    try {
      const res = await storiesCol.insertMany(toInsert, { ordered: false });
      inserted = res.insertedCount || 0;
      insertedDocs.push(...toInsert);
    } catch {
      // If duplicate race conditions occur, try one-by-one
      for (const d of toInsert) {
        try {
          await storiesCol.insertOne(d);
          inserted++;
          insertedDocs.push(d);
        } catch {
          // ignore dupes
        }
      }
    }
  }

  return { inserted, stories: insertedDocs };
}

export default fetchNewsFromSource;