// app/api/news/fetch/route.ts
import { NextResponse } from 'next/server';
import fetchNewsFromSource from '@/lib/fetchNews';
import { clientPromise } from '@/lib/mongoClient';
import { MongoBulkWriteError } from 'mongodb';

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
  const collection = db.collection('stories');

  // Try to insert new stories, ignore duplicates
  let insertedCount = 0;
  try {
    const result = await collection.insertMany(stories, { ordered: false });
    insertedCount = result.insertedCount;
  } catch (err) {
    if (err instanceof MongoBulkWriteError && err.code === 11000) {
      // Duplicate-key error: some stories already existed

      insertedCount = err.result?.nInserted ?? 0;
    } else {
      throw err;
    }
  }

  return NextResponse.json({
    ok: true,
    inserted: insertedCount,
    stories,
  });
}