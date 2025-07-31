import { MongoClient } from "mongodb";
import type { NewsStory } from "@/types";

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);
const db = client.db("newsDB");
const collection = db.collection("stories");

export async function insertStoriesIntoMongo(
  stories: NewsStory[]
): Promise<{ insertedCount: number; stories: NewsStory[] }> {
  await client.connect();
  const result = await collection.insertMany(stories);
  const insertedIds = Object.values(result.insertedIds);
  const insertedStories = await collection.find({ _id: { $in: insertedIds } }).toArray();
  return { insertedCount: result.insertedCount, stories: insertedStories };
}