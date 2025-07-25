// app/api/admin/cleanup/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const days = parseInt(process.env.CLEANUP_DAYS ?? '30', 10);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || 'kofa');
  const result = await db.collection('stories').deleteMany({ publishedAt: { $lt: cutoff } });

  return NextResponse.json({ ok: true, deleted: result.deletedCount }, { status: 200 });
}