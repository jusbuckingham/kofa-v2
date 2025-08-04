// app/dashboard/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from 'next/link';
import { ObjectId } from "mongodb";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import type { NewsStory } from "../types";
import StoryCard from '../components/StoryCard';

export default async function DashboardPage() {
  // ===== Session Check =====
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/signin');
  }

  // ===== Database Setup =====
  const dbName = process.env.MONGODB_DB_NAME || 'kofa';
  const client = await clientPromise;
  const db = client.db(dbName);

  // ===== Fetch User's Favorite Story IDs =====
  const favDocs = await db
    .collection<{ email: string; storyId: string }>('favorites')
    .find({ email: session.user.email })
    .toArray();

  // ===== Fetch Story Documents for Favorites =====
  const ids = favDocs.map(f => new ObjectId(f.storyId));
  const storyDocs = await db
    .collection('stories')
    .find({ _id: { $in: ids } })
    .sort({ publishedAt: -1 })
    .toArray();

  // ===== Map to NewsStory Interface =====
  const stories: NewsStory[] = storyDocs.map(doc => ({
    id: doc._id.toString(),
    title: doc.title,
    url: doc.url,
    summary: doc.summary,
    publishedAt: doc.publishedAt.toISOString(),
  }));

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Your Favorites</h1>

      {stories.length === 0 ? (
        <p className="text-center text-gray-500">
          You have no saved stories.{' '}
          <Link href="/">Browse stories</Link> to add some.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stories.map(story => (
            <div key={story.id} className="relative">
              <StoryCard story={story} />
              <button
                onClick={async () => {
                  await fetch('/api/favorites', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ storyId: story.id }),
                  });
                  // For simplicity, reload the page after removal
                  window.location.reload();
                }}
                className="absolute top-2 right-2 text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}