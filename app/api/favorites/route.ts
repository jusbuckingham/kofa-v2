import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { NewsStory } from "@/app/types";

export async function GET() {
  // Temporary placeholder until you add real auth
  const userEmail = "test@example.com";

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection("favorites");
  const favorites = await coll.find({ userEmail }).toArray();
  return NextResponse.json({ data: favorites });
}

export async function POST() {
  const userEmail = "test@example.com";
  const { story } = (await req.json()) as { story: NewsStory };

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection("favorites");
  await coll.insertOne({ userEmail, story, savedAt: new Date() });
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const userEmail = "test@example.com";
  const { storyId } = (await req.json()) as { storyId: string | number };

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection("favorites");
  await coll.deleteOne({ userEmail, "story.id": storyId });
  return NextResponse.json({ success: true });
}