// app/api/news/get/route.ts
import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '3', 10)

  const client = await clientPromise
  const db = client.db()
  const articles = await db
    .collection('articles')
    .find({})
    .sort({ publishedAt: -1 })
    .limit(limit)
    .toArray()

  return NextResponse.json({ data: articles })
}