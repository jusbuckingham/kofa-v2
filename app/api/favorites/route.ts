export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';
import type { SummaryItem } from '../../types';
import { ObjectId } from 'mongodb';

// Shape of a story document stored in MongoDB
type StoryDoc = {
  _id: ObjectId;
  title?: string;
  url?: string;
  summary?: {
    oneLiner?: string;
    bullets?: {
      who?: string;
      what?: string;
      when?: string;
      where?: string;
      why?: string;
    };
    colorNote?: string;
  };
  imageUrl?: string;
  publishedAt?: Date | string;
  source?: string;
  sources?: string[];
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json([], { status: 200 });
  }
  const email = session.user.email.trim().toLowerCase();

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || 'kofa');

  const favs = await db
    .collection<{ email: string; storyId: string }>('favorites')
    .find({ email })
    .toArray();
  const ids = favs.map(f => new ObjectId(f.storyId));

  const storyDocs = await db
    .collection<StoryDoc>('stories')
    .find({ _id: { $in: ids } })
    .sort({ publishedAt: -1 })
    .toArray();

  const stories: SummaryItem[] = storyDocs.map((doc) => {
    const url: string = doc.url || "";
    const publishedAt: string =
      doc.publishedAt instanceof Date
        ? doc.publishedAt.toISOString()
        : typeof doc.publishedAt === 'string'
        ? doc.publishedAt
        : '';
    const host = (() => {
      try { return url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch { return ''; }
    })();

    return {
      id: doc._id.toString(),
      title: doc.title ?? 'Untitled',
      url,
      oneLiner: doc.summary?.oneLiner ?? '',
      bullets: {
        who: doc.summary?.bullets?.who ?? '',
        what: doc.summary?.bullets?.what ?? '',
        when: doc.summary?.bullets?.when ?? '',
        where: doc.summary?.bullets?.where ?? '',
        why: doc.summary?.bullets?.why ?? '',
      },
      colorNote: doc.summary?.colorNote ?? '',
      imageUrl: doc.imageUrl ?? undefined,
      publishedAt,
      source: doc.source ?? host,
      sources: Array.isArray(doc.sources)
        ? doc.sources.map((src: string) => {
            try {
              const u = new URL(src);
              const d = u.hostname.replace(/^www\./, '');
              return { title: d, domain: d, url: src };
            } catch {
              return { title: src, domain: src, url: src };
            }
          })
        : [],
    } as SummaryItem;
  });

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
    { email: session.user.email.trim().toLowerCase(), storyId },
    { $set: { email: session.user.email.trim().toLowerCase(), storyId, savedAt: new Date() } },
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
  await db.collection('favorites').deleteOne({ email: session.user.email.trim().toLowerCase(), storyId });

  return NextResponse.json({ ok: true }, { status: 200 });
}