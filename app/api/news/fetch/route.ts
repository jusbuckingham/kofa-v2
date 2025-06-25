import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { connectToDB } from '@/lib/mongodb';
import { summarizeWithPerspective } from '@/lib/summarize';

const parser = new Parser();

export async function GET() {
  try {
    const db = await connectToDB();
    const collection = db.collection('summaries');

    const mockItems = [
      {
        title: "Black Entrepreneurs Lead Tech Funding Surge",
        contentSnippet: "Black founders saw a record increase in venture capital this quarter...",
        link: "https://example.com/article1",
      },
      {
        title: "Community-Led Policing Model Gains Ground",
        contentSnippet: "New pilot programs in major cities show a decrease in violence and stronger community ties...",
        link: "https://example.com/article2",
      },
    ];

    for (const item of mockItems) {
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

    return NextResponse.json({ message: 'Mock news processed and stored.' });
  } catch (error) {
    console.error('Error in fetch-news:', error);
    return NextResponse.json({ error: 'Failed to fetch news.' }, { status: 500 });
  }
}