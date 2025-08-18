/**
 * lib/fetchNews.ts
 * Scaffolds the news pipeline: RSS fetch → OpenAI summarization → MongoDB store
 */
import Parser from "rss-parser";
import clientPromise from "@/lib/mongodb";
import summarizeWithPerspective from "@/lib/summarize";

// Normalize URLs for dedupe (strip UTM/tracking, hash)
function normalizeUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw);
    u.hash = "";
    const params = u.searchParams;
    // Remove common tracking params
    [
      "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
      "utm_name","utm_id","utm_creative","gclid","fbclid","mc_cid","mc_eid"
    ].forEach((k) => params.delete(k));
    u.search = params.toString() ? `?${params.toString()}` : "";
    return u.toString();
  } catch {
    return raw || undefined;
  }
}

// Best-effort image extraction from RSS item
function extractImageFromItem(item: Parser.Item): string | undefined {
  // 1) enclosure
  const enc = (item as Parser.Item & { enclosure?: { url?: string } }).enclosure?.url;
  if (enc) return enc;

  // 2) content:encoded or content <img src>
  const html =
    (item as Record<string, unknown>)["content:encoded"] as string | undefined ??
    (typeof item.content === "string" ? item.content : "");
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (imgMatch?.[1]) return imgMatch[1];

  return undefined;
}

// Comma-separated list of RSS URLs in your .env.local
const FEED_URLS = (process.env.FEED_URLS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const parser = new Parser();

export interface StoryDoc {
  title: string;
  url: string;
  summary: string;
  publishedAt: Date;
  createdAt: Date;
  imageUrl?: string;
}

export async function fetchNewsFromSource(): Promise<{ inserted: number; stories: StoryDoc[] }> {
  if (FEED_URLS.length === 0) {
    return { inserted: 0, stories: [] };
  }

  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB_NAME ?? process.env.mongodb_db_name ?? "kofa";
  const db = client.db(dbName);
  const stories = db.collection<StoryDoc>("stories");

  let insertedCount = 0;
  const storiesInserted: StoryDoc[] = [];

  for (const feedUrl of FEED_URLS) {
    try {
      const feed = await parser.parseURL(feedUrl);

      const pendingDocs: StoryDoc[] = [];
      const seen = new Set<string>();

      for (const item of feed.items || []) {
        try {
          const url = normalizeUrl(item.link);
          if (!url) continue;

          if (seen.has(url)) continue; // de-dupe within the feed pass
          seen.add(url);

          // Skip if already ingested
          const exists = await stories.findOne({ url });
          if (exists) continue;

          // Summarize content snippet or summary field
          const textToSummarize =
            (item.contentSnippet as string) || (item.content as string) || (item.summary as string) || item.title || "";
          const summaryResult = await summarizeWithPerspective(textToSummarize);
          const summary = typeof summaryResult === "string" ? summaryResult : summaryResult.oneLiner;

          // Image extraction (enclosure or first <img> in content)
          const imageUrl = extractImageFromItem(item);

          const doc: StoryDoc = {
            title: item.title || "Untitled",
            url,
            summary,
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            createdAt: new Date(),
            imageUrl,
          };

          pendingDocs.push(doc);
        } catch (e) {
          // Per-item failure shouldn't stop the rest
          console.error("Error processing item", { feedUrl, title: item?.title, err: e });
          continue;
        }
      }

      if (pendingDocs.length) {
        try {
          const res = await stories.insertMany(pendingDocs, { ordered: false });
          insertedCount += res.insertedCount || 0;
          storiesInserted.push(...pendingDocs);
        } catch {
          // In case of duplicates without an index, fall back to individual inserts
          for (const d of pendingDocs) {
            try {
              await stories.insertOne(d);
              insertedCount++;
              storiesInserted.push(d);
            } catch {
              // ignore duplicate or race condition errors
            }
          }
        }
      }
    } catch (err) {
      console.error(`Error processing feed ${feedUrl}:`, err);
    }
  }

  return { inserted: insertedCount, stories: storiesInserted };
}

export default fetchNewsFromSource;