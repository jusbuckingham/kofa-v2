export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import type { NewsStory } from '../../types';
import { ObjectId } from 'mongodb';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json([], { status: 200 });
  }
  const email = session.user.email;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || 'kofa');

  const favs = await db
    .collection<{ email: string; storyId: string }>('favorites')
    .find({ email })
    .toArray();
  const ids = favs.map(f => new ObjectId(f.storyId));

  const storyDocs = await db
    .collection('stories')
    .find({ _id: { $in: ids } })
    .sort({ publishedAt: -1 })
    .toArray();

  const stories: NewsStory[] = storyDocs.map(doc => ({
    id: doc._id.toString(),
    title: doc.title,
    url: doc.url,
    summary: doc.summary,
    publishedAt: doc.publishedAt.toISOString(),
  }));

  return NextResponse.json(stories, { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { storyId } = (await req.json()) as { storyId: string };

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || 'kofa');
  await db.collection('favorites').updateOne(
    { email: session.user.email, storyId },
    { $set: { email: session.user.email, storyId, savedAt: new Date() } },
    { upsert: true }
  );

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { storyId } = (await req.json()) as { storyId: string };

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || 'kofa');
  await db.collection('favorites').deleteOne({ email: session.user.email, storyId });

  return NextResponse.json({ ok: true }, { status: 200 });
}