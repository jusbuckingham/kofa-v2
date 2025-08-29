// app/api/admin/cleanup/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongoClient';

// NOTE: This endpoint purges old stories. Access is restricted to an explicit allowlist.
// If ALLOWED_ADMINS/FALLBACK_ADMINS are empty, only the project owner email is permitted.

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE });
  }

  // Admin allowlist: comma-separated emails in ENV, case-insensitive.
  // Prefer ALLOWED_ADMINS, fall back to FALLBACK_ADMINS, and finally include the primary owner email.
  const allowList = [
    ...(process.env.ALLOWED_ADMINS ? process.env.ALLOWED_ADMINS.split(',') : []),
    ...(process.env.FALLBACK_ADMINS ? process.env.FALLBACK_ADMINS.split(',') : []),
    'jus.buckingham@gmail.com',
  ]
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const isAllowed = allowList.includes(session.user.email.trim().toLowerCase());
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