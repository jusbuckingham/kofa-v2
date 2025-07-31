// app/api/news/get/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse, NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit  = parseInt(searchParams.get("limit")  || "10", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const client = await clientPromise;
  const db     = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const col    = db.collection("stories");

  const total = await col.countDocuments();
  // fetch raw documents
  const docs = await col
    .find()
    .sort({ publishedAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray();

  // map _id to string id and format dates
  const stories = docs.map(doc => ({
  id:            doc._id.toString(),
  title:         doc.title,
  url:           doc.url,
  summary:       doc.summary,
  imageUrl:      doc.imageUrl,
  source:        doc.source,
  category:      doc.category,
  publishedAt:   doc.publishedAt.toISOString(),
}));

  return NextResponse.json({ ok: true, stories, total }, { status: 200 });
}