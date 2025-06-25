import { NextRequest, NextResponse } from 'next/server';
import { connectToDB } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const db = await connectToDB();
    const collection = db.collection('summaries');

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const afterDate = searchParams.get('afterDate');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const keyword = searchParams.get('keyword');
    const category = searchParams.get('category');
    const sort = searchParams.get('sort');

    const filter: any = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    } else if (afterDate) {
      filter.date = { $gt: new Date(afterDate) };
    }
    if (keyword) {
      filter.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { summary: { $regex: keyword, $options: 'i' } },
      ];
    }
    if (category && category !== 'all') {
      filter.category = category;
    }

    const news = await collection.find(filter)
      .sort({ date: sort === 'oldest' ? 1 : -1 })
      .skip(offset)
      .limit(limit + 1)
      .toArray();

    const hasMore = news.length > limit;
    if (hasMore) news.pop();

    return NextResponse.json({ news, hasMore });
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json({ error: 'Failed to load news.' }, { status: 500 });
  }
}