export const dynamic = "force-dynamic";
// app/api/news/fetch/route.ts
import { NextResponse } from 'next/server';
import fetchNewsFromSource from '@/lib/fetchNews';
import { clientPromise } from '@/lib/mongoClient';
import { MongoBulkWriteError } from 'mongodb';
import summarizeWithPerspective from "@/lib/summarize";

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

type SummaryOp = {
  updateOne: {
    filter: { id: string };
    update: { $set: Record<string, unknown> };
    upsert: boolean;
  };
};

async function extractOgImage(url: string): Promise<string | undefined> {
  try {
    // basic absolute URL guard
    const ok = /^https?:\/\//i.test(url);
    if (!ok) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    clearTimeout(timer);
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
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function toISO(value?: string | Date): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.toISOString();
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('Authorization')?.split(' ')[1];

  if (!secret || authHeader !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Pull in the latest stories
  const { stories } = await fetchNewsFromSource();

  // Connect to MongoDB
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
  const storiesColl = db.collection("stories");
  const summariesColl = db.collection("summaries");

  // Try to insert new stories, ignore duplicates
  let insertedCount = 0;
  try {
    const result = await storiesColl.insertMany(stories, { ordered: false });
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

  // Build summaries for each story (best-effort fields)
  const summaryOps: SummaryOp[] = await Promise.all(
    stories.map(async (s: IngestStory) => {
      const url: string = s.url || s.link || "";
      const title: string = s.title || s.headline || "Untitled";
      const source: string = s.source || toDomain(url || s.link || "") || "";
      const publishedAt: string = toISO(s.publishedAt) ?? toISO(s.pubDate) ?? new Date().toISOString();
      const body: string = s.content || s.description || s.snippet || s.excerpt || title;

      // Prefer feed image, only fetch HTML if missing
      const imageUrl = s.imageUrl || s.image || (await extractOgImage(url)) || undefined;

      // Summarize into one-liner + 4 bullets (no labels)
      let oneLiner = "";
      let bullets: string[] = ["", "", "", ""];
      try {
        const ai = await summarizeWithPerspective(body);
        oneLiner = ai.oneLiner;
        const raw = Array.isArray(ai.bullets) ? ai.bullets : [];
        const four = raw.slice(0, 4);
        while (four.length < 4) four.push("");
        bullets = four;
      } catch {
        // leave minimal fields if summarization fails
        oneLiner = title;
      }

      const sources = [
        { title, url, domain: toDomain(url) }
      ];

      const id = s.id || url; // use URL as id fallback

      return {
        updateOne: {
          filter: { id },
          update: {
            $set: {
              id,
              title,
              url,
              source,
              publishedAt,
              imageUrl,
              oneLiner,
              bullets,
              sources,
            },
          },
          upsert: true,
        },
      };
    })
  );

  // Upsert summaries in bulk
  let upserted = 0;
  if (summaryOps.length) {
    const res = await summariesColl.bulkWrite(summaryOps, { ordered: false });
    // upsertedCount may be undefined in some drivers, compute safely
    upserted = (res.upsertedCount ?? 0) + (res.modifiedCount ?? 0);
  }

  return NextResponse.json({
    ok: true,
    inserted: insertedCount,
    upsertedSummaries: upserted,
    count: stories.length,
  });
}