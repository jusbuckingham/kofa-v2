import { NextRequest, NextResponse } from 'next/server';
import { connectToDB } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const db = await connectToDB();
    const collection = db.collection('summaries');

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const afterDate = searchParams.get('afterDate');
    const keyword = searchParams.get('keyword');
    const category = searchParams.get('category');

    const filter: any = {};
    if (afterDate) {
      filter.date = { $gt: new Date(afterDate) };
    }
    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { summary: { $regex: keyword, $options: 'i' } },
      ];
    }
    if (category) {
      filter.category = category;
    }

    const news = await collection.find(filter)
      .sort({ date: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json({ error: 'Failed to load news.' }, { status: 500 });
  }
}