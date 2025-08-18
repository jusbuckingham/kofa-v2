// app/api/news/get/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse, NextRequest } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { peekSummaryQuota } from "@/lib/quota";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit  = parseInt(searchParams.get("limit")  || "10", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const client = await clientPromise;
  const db     = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const col    = db.collection("summaries");

  const total = await col.countDocuments();
  // fetch raw documents
  const docs = await col
    .find()
    .sort({ publishedAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray();

  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  let quotaInfo = null;
  if (email) {
    quotaInfo = await peekSummaryQuota(email);
  }

  const stories = docs.map((doc) => {
    const locked =
      quotaInfo && !quotaInfo.hasActiveSub &&
      quotaInfo.summariesToday >= (quotaInfo.limit ?? 0);
    return {
      id: doc.id || doc._id.toString(),
      title: doc.title,
      url: doc.url,
      imageUrl: doc.imageUrl,
      source: doc.source,
      publishedAt: doc.publishedAt instanceof Date ? doc.publishedAt.toISOString() : doc.publishedAt,
      oneLiner: doc.oneLiner,
      bullets: doc.bullets,
      colorNote: doc.colorNote,
      sources: doc.sources || [],
      locked,
    };
  });

  return NextResponse.json({ ok: true, stories, total, quota: quotaInfo }, { status: 200 });
}