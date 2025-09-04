export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/mongoClient';

// Types
type FavoriteDoc = {
  email: string;
  storyId: string;
  createdAt: Date;
};

type FavoriteInput = {
  storyId: string;
};

// Ensure a unique index on { email, storyId } to keep favorites idempotent
let ensureIndexPromise: Promise<void> | null = null;
async function ensureFavoritesIndex() {
  if (!ensureIndexPromise) {
    ensureIndexPromise = (async () => {
      try {
        const db = await getDb();
        await db
          .collection<FavoriteDoc>('favorites')
          .createIndex({ email: 1, storyId: 1 }, { unique: true, name: 'uniq_email_story' });
      } catch {
        // ignore (already exists, permissions, etc.)
      }
    })();
  }
  return ensureIndexPromise;
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

function jsonError(message: string, status = 400) {
  return json({ ok: false, error: message }, status);
}

async function requireSessionEmail() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return session.user.email.trim().toLowerCase();
}

// GET /api/favorites?limit=50&offset=0
export async function GET(req: NextRequest) {
  try {
    const email = await requireSessionEmail();
    await ensureFavoritesIndex();
    const db = await getDb();

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = Math.min(Math.max(Number(limitParam ?? 0) || 0, 0), 200); // cap to 200
    const offset = Math.max(Number(offsetParam ?? 0) || 0, 0);

    const coll = db.collection<FavoriteDoc>('favorites');

    const cursor = coll
      .find({ email })
      .project<{ storyId: string }>({ _id: 0, storyId: 1 })
      .sort({ createdAt: -1 });

    const total = await coll.countDocuments({ email });

    if (limit > 0) {
      cursor.skip(offset).limit(limit);
    }

    const favs = await cursor.toArray();
    const items = favs.map((f) => ({ id: f.storyId }));

    return json({ ok: true, items, total, limit, offset });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[favorites][GET] Failed to load favorites:', err);
    return jsonError('Failed to load favorites', 500);
  }
}

// POST /api/favorites -> { storyId }
export async function POST(req: NextRequest) {
  try {
    const email = await requireSessionEmail();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const storyId = typeof (body as FavoriteInput)?.storyId === 'string'
      ? (body as FavoriteInput).storyId.trim()
      : '';

    if (!storyId) return jsonError('Invalid payload: missing storyId', 422);

    await ensureFavoritesIndex();
    const db = await getDb();

    await db
      .collection<FavoriteDoc>('favorites')
      .updateOne(
        { email, storyId },
        { $setOnInsert: { email, storyId, createdAt: new Date() } },
        { upsert: true }
      );

    return json({ ok: true, storyId });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[favorites][POST] Failed to save favorite:', err);
    return jsonError('Failed to save favorite', 500);
  }
}

// DELETE /api/favorites -> { storyId }
export async function DELETE(req: NextRequest) {
  try {
    const email = await requireSessionEmail();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const storyId = typeof (body as FavoriteInput)?.storyId === 'string'
      ? (body as FavoriteInput).storyId.trim()
      : '';

    if (!storyId) return jsonError('Invalid payload: missing storyId', 422);

    await ensureFavoritesIndex();
    const db = await getDb();

    await db.collection<FavoriteDoc>('favorites').deleteOne({ email, storyId });

    return json({ ok: true, storyId });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[favorites][DELETE] Failed to remove favorite:', err);
    return jsonError('Failed to remove favorite', 500);
  }
}