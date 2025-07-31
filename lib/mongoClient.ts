// lib/mongoClient.ts
import { MongoClient } from "mongodb";
import type { NewsStory } from "@/types";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB_NAME!;

// Use a global to prevent exhausting connections in dev:
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

if (!uri) {
  throw new Error("MONGODB_URI is not set");
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
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