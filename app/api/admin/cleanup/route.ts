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

  // Admin allowlist: comma-separated emails in ENV, case-insensitive
  const allow = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const isAllowed = allow.length === 0
    ? true // if no allowlist is set, default to allowing any authenticated user
    : allow.includes(session.user.email.trim().toLowerCase());
  if (!isAllowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const days = Number.isFinite(Number(process.env.CLEANUP_DAYS))
      ? parseInt(process.env.CLEANUP_DAYS as string, 10)
      : 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || 'kofa');

    // Ensure we only delete documents with Date-type publishedAt older than cutoff
    const result = await db
      .collection('stories')
      .deleteMany({ publishedAt: { $type: 'date', $lt: cutoff } });

    return NextResponse.json({ ok: true, deleted: result.deletedCount, cutoff: cutoff.toISOString(), days }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: 'Cleanup failed', details: String(err) }, { status: 500 });
  }
}