import { NextResponse } from "next/server";
import fetchNewsFromSource from "@/lib/fetchNews";
import clientPromise from "@/lib/mongoClient";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("Authorization")?.split(" ")[1];

  if (!secret || authHeader !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pull the fresh stories (with imageUrl, summary, etc.)
  const stories = await fetchNewsFromSource();

  // Insert into Mongo (ignore duplicates)
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
  const collection = db.collection("stories");
  const { insertedCount } = await collection
    .insertMany(stories, { ordered: false })
    .catch((err: any) => {
      if (err.code === 11000) {
        // duplicate key error, return whatever was inserted
        return { insertedCount: err.result.nInserted };
      }
      throw err;
    });

  return NextResponse.json({
    ok: true,
    inserted: insertedCount,
    stories,
  });
}