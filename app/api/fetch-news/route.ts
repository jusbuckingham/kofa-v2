import { NextResponse }           from 'next/server';
import Parser                     from 'rss-parser';
import { connectToDB }            from '../../../lib/mongodb';
import { summarizeWithPerspective } from '../../../lib/summarize';

const parser = new Parser();

// Define RSS feeds with associated categories
const FEEDS = [
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',     category: 'politics' },
  { url: 'http://feeds.bbci.co.uk/news/rss.xml',                           category: 'general' },
  { url: 'https://www.npr.org/rss/rss.php?id=1001',                        category: 'culture' },
  { url: 'https://www.theguardian.com/world/rss',                          category: 'world' },
];
const ITEMS_PER_FEED = 10;

export async function GET() {
  try {
    const db = await connectToDB();
    const collection = db.collection('summaries');

    for (const feedConfig of FEEDS) {
      const { url, category } = feedConfig;
      let feed;
      try {
        feed = await parser.parseURL(url);
      } catch (err) {
        console.warn(`Failed to fetch RSS from ${url}:`, err);
        continue;
      }

      // Take up to ITEMS_PER_FEED items per feed
      const items = feed.items.slice(0, ITEMS_PER_FEED);

      for (const item of items) {
        if (!item.link || !item.title) continue;

        // Skip if already stored
        const exists = await collection.findOne({ link: item.link });
        if (exists) continue;

        // Summarize content
        const content = `${item.title}\n\n${item.contentSnippet || item.content || ''}`;
        const summary = await summarizeWithPerspective(content);

        // Insert into DB
        await collection.insertOne({
          title: item.title,
          summary,
          link: item.link,
          source: feed.title || url,
          date: new Date(item.pubDate || Date.now()),
          category, // mapped from feedConfig
        });
      }
    }

    return NextResponse.json({ message: 'Aggregated and stored news successfully.' });
  } catch (error: any) {
    console.error('Error in fetch-news:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error', stack: error.stack },
      { status: 500 }
    );
  }
}