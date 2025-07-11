import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "5", 10);

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
    const coll = db.collection("summaries");  // or your collection
    const articles = await coll
      .find({})
      .sort({ date: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({ data: articles });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}