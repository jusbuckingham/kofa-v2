export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/mongodb';

// Types
type FavoriteDoc = {
  email: string;
  storyId: string;
  createdAt: Date;
};

type FavoriteInput = {
  storyId: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return session.user.email.trim().toLowerCase();
}

// GET /api/favorites -> list of saved story IDs for the current user
export async function GET() {
  try {
    const email = await requireSession();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const favs = await db
      .collection<FavoriteDoc>('favorites')
      .find({ email })
      .project<{ storyId: string }>({ _id: 0, storyId: 1 })
      .toArray();

    const items = favs.map((f) => ({ id: f.storyId }));
    return NextResponse.json(items, { status: 200 });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError('Failed to load favorites', 500);
  }
}

// POST /api/favorites -> save a story { storyId }
export async function POST(req: NextRequest) {
  try {
    const email = await requireSession();
    const body = (await req.json()) as unknown;

    if (!body || typeof body !== 'object' || typeof (body as FavoriteInput).storyId !== 'string') {
      return jsonError('Invalid payload: missing storyId', 422);
    }

    const storyId = (body as FavoriteInput).storyId.trim();
    if (!storyId) return jsonError('storyId cannot be empty', 422);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    await db
      .collection<FavoriteDoc>('favorites')
      .updateOne(
        { email, storyId },
        { $setOnInsert: { email, storyId, createdAt: new Date() } },
        { upsert: true }
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError('Failed to save favorite', 500);
  }
}

// DELETE /api/favorites -> remove a favorite { storyId }
export async function DELETE(req: NextRequest) {
  try {
    const email = await requireSession();
    const body = (await req.json()) as unknown;

    if (!body || typeof body !== 'object' || typeof (body as FavoriteInput).storyId !== 'string') {
      return jsonError('Invalid payload: missing storyId', 422);
    }

    const storyId = (body as FavoriteInput).storyId.trim();
    if (!storyId) return jsonError('storyId cannot be empty', 422);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    await db.collection<FavoriteDoc>('favorites').deleteOne({ email, storyId });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError('Failed to remove favorite', 500);
  }
}