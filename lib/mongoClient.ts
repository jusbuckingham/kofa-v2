// lib/mongoClient.ts
import { MongoClient, MongoServerError } from "mongodb";
import type { WithId } from "mongodb";
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
export const clientPromise: Promise<MongoClient> =
  process.env.NODE_ENV === "development"
    ? g._mongoClientPromise || (g._mongoClientPromise = client.connect())
    : client.connect();

export async function getDb() {
  const c = await clientPromise;
  return c.db(dbName);
}

/**
 * Insert stories while avoiding duplicates by canonical URL.
 * - Ensures unique index on `url` once
 * - Pre-checks existing URLs to avoid BulkWrite duplicate errors
 * - Returns both newly inserted and already-existing stories that match input
 */
export async function insertStoriesIntoMongo(
  stories: NewsStory[]
): Promise<{ insertedCount: number; stories: WithId<NewsStory>[] }> {
  const db = await getDb();
  const collection = db.collection<NewsStory>("stories");

  // Ensure a unique index on canonical URL before inserting (idempotent)
  await collection.createIndex({ url: 1 }, { unique: true, name: "uniq_url" });

  // Short-circuit when nothing to insert
  if (!stories || stories.length === 0) {
    return { insertedCount: 0, stories: [] };
  }

  // Deduplicate against what's already in the DB
  const urls = stories.map((s) => s.url);
  const existing = await collection
    .find({ url: { $in: urls } })
    .toArray() as WithId<NewsStory>[];
  const existingUrlSet = new Set(existing.map((d) => d.url));

  const toInsert = stories.filter((s) => !existingUrlSet.has(s.url));

  let insertedDocs: WithId<NewsStory>[] = [];
  let insertedCount = 0;

  if (toInsert.length > 0) {
    try {
      const insertResult = await collection.insertMany(toInsert, { ordered: false });
      const insertedIds = Object.values(insertResult.insertedIds);
      insertedCount = insertResult.insertedCount;
      if (insertedIds.length) {
        insertedDocs = (await collection
          .find({ _id: { $in: insertedIds } })
          .toArray()) as WithId<NewsStory>[];
      }
    } catch (error) {
      // If we still hit a duplicate due to a race, fetch what exists and continue
      if (error instanceof MongoServerError && error.code === 11000) {
        const refreshed = (await collection
          .find({ url: { $in: toInsert.map((s) => s.url) } })
          .toArray()) as WithId<NewsStory>[];
        insertedDocs = refreshed;
        insertedCount = refreshed.length; // best effort accounting
      } else {
        throw error;
      }
    }
  }

  // Return combined: existing + newly inserted (unique by URL)
  const combinedByUrl = new Map<string, WithId<NewsStory>>();
  for (const doc of existing) combinedByUrl.set(doc.url, doc);
  for (const doc of insertedDocs) combinedByUrl.set(doc.url, doc);

  return { insertedCount, stories: Array.from(combinedByUrl.values()) };
}