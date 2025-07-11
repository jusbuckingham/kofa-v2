// app/api/news/get/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '3', 10)
  const dbName = process.env.MONGODB_DB_NAME || 'kofa';

  // DEBUG: print out the connection URI
  console.log('→ MONGODB_URI:', process.env.MONGODB_URI)

  try {
    const client = await clientPromise
    const db = client.db(dbName)
    console.log('→ Connected to database:', db.databaseName)

    // DEBUG: count how many docs are in the collection
    const coll = db.collection('summaries')
    const total = await coll.countDocuments()
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    console.log(`→ Articles in DB: ${total}`)

    // fetch the most recent
    const articles = await coll
      .find({})
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    console.log(`→ Returning ${articles.length} articles`)

    return NextResponse.json({ data: articles, totalPages });
  } catch (err) {
    console.error('⨯ DB error:', err)
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    )
  }
}