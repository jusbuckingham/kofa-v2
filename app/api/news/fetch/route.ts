// app/api/news/fetch/route.ts
import { NextResponse } from 'next/server';
import fetchNewsFromSource from '@/lib/fetchNews';
import { clientPromise } from '@/lib/mongoClient';
import { MongoBulkWriteError } from 'mongodb';
import summarizeWithPerspective from "@/lib/summarize";

async function extractOgImage(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    const html = await res.text();
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    if (ogMatch?.[1]) return ogMatch[1];
    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i);
    if (twMatch?.[1]) return twMatch[1];
  } catch (_) {
    // ignore network/parse errors
  }
  return undefined;
}

function toDomain(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
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
    if (err instanceof MongoBulkWriteError && (err as any).code === 11000) {
      insertedCount = (err as any).result?.nInserted ?? 0;
    } else {
      throw err;
    }
  }

  // Build summaries for each story (best-effort fields)
  const summaryOps = await Promise.all(
    stories.map(async (s: any) => {
      const url: string = s.url || s.link || "";
      const title: string = s.title || s.headline || "Untitled";
      const source: string = s.source || toDomain(url) || "";
      const publishedAt: string = s.publishedAt || s.pubDate || new Date().toISOString();
      const body: string = s.content || s.description || s.snippet || s.excerpt || title;

      // Fetch image (og/twitter) with fallback
      const imageUrl = (await extractOgImage(url)) || s.imageUrl || s.image || undefined;

      // Summarize into 5Ws + lens + one-liner
      let oneLiner = "";
      let bullets = { who: "", what: "", where: "", when: "", why: "" };
      let colorNote = "";
      try {
        const ai = await summarizeWithPerspective(body);
        oneLiner = ai.oneLiner;
        bullets = ai.bullets;
        colorNote = ai.colorNote;
      } catch (_) {
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
              colorNote,
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