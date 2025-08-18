/**
 * lib/fetchNews.ts
 * Scaffolds the news pipeline: RSS fetch → OpenAI summarization → MongoDB store
 */
import Parser from "rss-parser";
import clientPromise from "@/lib/mongodb";
import summarizeWithPerspective from "@/lib/summarize";

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
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB_NAME ?? process.env.mongodb_db_name ?? "kofa";
  const db = client.db(dbName);
  const stories = db.collection<StoryDoc>("stories");

  let insertedCount = 0;
  const storiesInserted: StoryDoc[] = [];

  for (const feedUrl of FEED_URLS) {
    try {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items || []) {
        const url = item.link;
        if (!url) continue;

        // Skip if already ingested
        const exists = await stories.findOne({ url });
        if (exists) continue;

        // Summarize content snippet or summary field
        const textToSummarize =
          item.contentSnippet || item.content || item.summary || item.title || "";
        const summaryResult = await summarizeWithPerspective(textToSummarize);
        const summary = typeof summaryResult === "string" ? summaryResult : summaryResult.oneLiner;

        // attempt to pull an enclosure/image URL from the feed item
        const imageUrl = item.enclosure?.url;

        const doc: StoryDoc = {
          title: item.title || "Untitled",
          url,
          summary,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          createdAt: new Date(),
          imageUrl,
        };
        await stories.insertOne(doc);
        insertedCount++;
        storiesInserted.push(doc);
      }
    } catch (err) {
      console.error(`Error processing feed ${feedUrl}:`, err);
    }
  }

  return { inserted: insertedCount, stories: storiesInserted };
}

export default fetchNewsFromSource;