// lib/mongoClient.ts
import { MongoClient, MongoServerError } from "mongodb";
import type { NewsStory } from "../app/types";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

if (!uri) {
  throw new Error("MONGODB_URI is not set");
}
if (!dbName) {
  throw new Error("MONGODB_DB_NAME is not set");
}

// Use a global to prevent exhausting connections in dev:
const client = new MongoClient(uri);
const g = globalThis as typeof globalThis & { _mongoClientPromise?: Promise<MongoClient> };
const clientPromise =
  process.env.NODE_ENV === "development"
    ? g._mongoClientPromise || (g._mongoClientPromise = client.connect())
    : client.connect();

export async function insertStoriesIntoMongo(
  stories: NewsStory[]
): Promise<{ insertedCount: number; stories: NewsStory[] }> {
  const client = await clientPromise;
  const db = client.db(dbName);

  // Ensure a unique index on canonical URL before inserting (avoids dupes)
  await db.collection<NewsStory>("stories").createIndex({ url: 1 }, { unique: true });

  try {
    const insertResult = await db
      .collection<NewsStory>("stories")
      .insertMany(stories, { ordered: false });

    const insertedIds = Object.values(insertResult.insertedIds);
    const insertedStories = await db
      .collection<NewsStory>("stories")
      .find({ _id: { $in: insertedIds } })
      .toArray();

    return { insertedCount: insertResult.insertedCount, stories: insertedStories };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      console.warn("Duplicate key error while inserting stories", error);
      return { insertedCount: 0, stories: [] };
    }
    throw error;
  }
}

export { clientPromise };