import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { connectToDB } from '@/lib/mongodb';
import { summarizeWithPerspective } from '@/lib/summarize';

const parser = new Parser();

export async function GET() {
  try {
    const db = await connectToDB();
    const collection = db.collection('summaries');

    const feed = await parser.parseURL('https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml');
    const entries = feed.items.slice(0, 5); // adjust count if needed

    for (const item of entries) {
      const existing = await collection.findOne({ link: item.link });
      if (existing) continue;

      const summary = await summarizeWithPerspective(`${item.title}\n\n${item.contentSnippet}`);
      await collection.insertOne({
        title: item.title,
        summary,
        link: item.link,
        date: new Date(),
      });
    }

    return NextResponse.json({ message: 'News fetched and stored.' });
  } catch (error) {
    console.error('Error in fetch-news:', error);
    return NextResponse.json({ error: 'Failed to fetch news.' }, { status: 500 });
  }
}