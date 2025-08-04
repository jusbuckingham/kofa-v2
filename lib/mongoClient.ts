// lib/mongoClient.ts
import { MongoClient } from "mongodb";
import type { NewsStory } from "@/types";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB_NAME!;

// Use a global to prevent exhausting connections in dev:
const client = new MongoClient(uri);
const clientPromise =
  process.env.NODE_ENV === "development"
    ? global._mongoClientPromise || (global._mongoClientPromise = client.connect())
    : client.connect();

declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

if (!uri) {
  throw new Error("MONGODB_URI is not set");
}

export async function insertStoriesIntoMongo(
  stories: NewsStory[]
): Promise<{ insertedCount: number; stories: NewsStory[] }> {
  const client = await clientPromise;
  const db = client.db(dbName);
  const insertResult = await db
    .collection<NewsStory>("stories")
    .insertMany(stories, { ordered: false });
  const insertedIds = Object.values(insertResult.insertedIds);
  const insertedStories = await db
    .collection<NewsStory>("stories")
    .find({ _id: { $in: insertedIds } })
    .toArray();
  return { insertedCount: insertResult.insertedCount, stories: insertedStories };
}

export { clientPromise };