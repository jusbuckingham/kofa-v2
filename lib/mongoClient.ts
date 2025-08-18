// lib/mongoClient.ts
import { MongoClient, MongoServerError } from "mongodb";
import type { NewsStory } from "@/types";

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
const clientPromise =
  process.env.NODE_ENV === "development"
    ? global._mongoClientPromise || (global._mongoClientPromise = client.connect())
    : client.connect();

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function insertStoriesIntoMongo(
  stories: NewsStory[]
): Promise<{ insertedCount: number; stories: NewsStory[] }> {
  const client = await clientPromise;
  const db = client.db(dbName);

  // Ensure a unique index on title and link before inserting
  await db.collection<NewsStory>("stories").createIndex({ title: 1, link: 1 }, { unique: true });

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