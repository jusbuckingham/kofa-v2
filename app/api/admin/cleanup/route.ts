// app/api/admin/cleanup/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongoClient';

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  // Admin allowlist: comma-separated emails in ENV, case-insensitive
  const allow = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const isAllowed = allow.length === 0
    ? true // if no allowlist is set, default to allowing any authenticated user
    : allow.includes(session.user.email.trim().toLowerCase());
  if (!isAllowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE });
  }

  try {
    const rawDays = parseInt(String(process.env.CLEANUP_DAYS ?? ''), 10);
    const days = Number.isFinite(rawDays) ? Math.min(365, Math.max(7, rawDays)) : 30;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const db = await getDb();

    // Ensure we only delete documents with Date-type publishedAt older than cutoff
    const result = await db
      .collection('stories')
      .deleteMany({ publishedAt: { $type: 'date', $lt: cutoff } });

    return NextResponse.json({ ok: true, deleted: result.deletedCount, cutoff: cutoff.toISOString(), days }, { status: 200, headers: NO_STORE });
  } catch (err) {
    return NextResponse.json({ error: 'Cleanup failed', details: String(err) }, { status: 500, headers: NO_STORE });
  }
}