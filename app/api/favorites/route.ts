import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { NewsStory } from "@/app/types";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection("favorites");
  const favorites = await coll.find({ userEmail }).toArray();
  return NextResponse.json({ data: favorites });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;
  const { story } = (await request.json()) as { story: NewsStory };

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection("favorites");
  await coll.insertOne({ userEmail, story, savedAt: new Date().toISOString() });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;
  // Try to read a storyId; if none, clear all
  let body: { storyId?: string | number } = {};
  try {
    body = await request.json();
  } catch {
    /* no JSON body */
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const coll = db.collection("favorites");

  if (body.storyId !== undefined) {
    await coll.deleteOne({ userEmail, "story.id": body.storyId });
  } else {
    await coll.deleteMany({ userEmail });
  }

  return NextResponse.json({ success: true });
}