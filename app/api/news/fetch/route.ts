// app/api/news/fetch/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse, NextRequest } from 'next/server';
import { fetchAndStoreNews } from '@/lib/fetchNews';

export async function GET(req: NextRequest) {
  // Expect header: Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get('Authorization')?.split(' ')[1];
  if (!auth || auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { inserted } = await fetchAndStoreNews();
    return NextResponse.json({ ok: true, inserted }, { status: 200 });
  } catch (err) {
    console.error('Fetch pipeline error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}