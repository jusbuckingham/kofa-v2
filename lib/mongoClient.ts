// lib/mongoClient.ts
import { MongoClient, MongoServerError } from "mongodb";
import type { WithId } from "mongodb";
import type { NewsStory } from "../app/types";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || process.env.MONGODB_DB;

if (!uri) {
  throw new Error("MONGODB_URI is not set");
}
if (!dbName) {
  throw new Error("MONGODB_DB_NAME (or MONGODB_DB) is not set");
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
    .find({ url: { $in: urls } }, { projection: { _id: 1, url: 1 } })
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
      // If we still hit a duplicate due to a race or parallel run, compute how many ended up inserted
      if (error instanceof MongoServerError && error.code === 11000) {
        // Re-read the subset (toInsert URLs) now present in the DB
        const presentAfter = (await collection
          .find({ url: { $in: toInsert.map((s) => s.url) } }, { projection: { _id: 1, url: 1 } })
          .toArray()) as WithId<NewsStory>[];

        // Of those, how many were already present before we tried to insert?
        const toInsertUrlSet = new Set(toInsert.map((s) => s.url));
        const preExistingAmongToInsert = existing.filter((d) => toInsertUrlSet.has(d.url)).length;
        const presentCount = presentAfter.length;

        // Newly inserted this call ≈ present now minus those that existed before among this subset
        insertedCount = Math.max(0, presentCount - preExistingAmongToInsert);

        // Optionally fetch full docs for the newly inserted subset; but keep prior behavior of returning
        // the combined docs. Here we just fetch the present subset to merge later.
        insertedDocs = (await collection
          .find({ _id: { $in: presentAfter.map((d) => d._id) } })
          .toArray()) as WithId<NewsStory>[];
      } else {
        throw error;
      }
    }
  }

  // Return combined: existing + newly inserted (unique by URL)
  // Note: insertedCount reflects the number of *new* stories added by this call (best-effort under concurrency).
  const combinedByUrl = new Map<string, WithId<NewsStory>>();
  for (const doc of existing) combinedByUrl.set(doc.url, doc);
  for (const doc of insertedDocs) combinedByUrl.set(doc.url, doc);

  return { insertedCount, stories: Array.from(combinedByUrl.values()) };
}