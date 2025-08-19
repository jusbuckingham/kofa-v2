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
import type { SummaryItem } from "../types";
import StoryCard from "../components/StoryCard";

// Shape of the story as stored in MongoDB
type StoryDoc = {
  _id: ObjectId;
  title?: string;
  url?: string;
  summary?: {
    oneLiner?: string;
    bullets?: {
      who?: string;
      what?: string;
      when?: string;
      where?: string;
      why?: string;
    };
    colorNote?: string;
  };
  imageUrl?: string;
  publishedAt?: Date | string;
  source?: string;
  sources?: string[];
};

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

  // ===== Map to SummaryItem Interface =====
  const stories: SummaryItem[] = (storyDocs as StoryDoc[]).map((doc) => {
    const url = doc.url || "";
    const publishedAt =
      doc.publishedAt instanceof Date
        ? doc.publishedAt.toISOString()
        : typeof doc.publishedAt === "string"
        ? doc.publishedAt
        : undefined;

    return {
      id: doc._id.toString(),
      title: doc.title ?? "Untitled",
      url,
      oneLiner: doc.summary?.oneLiner ?? "",
      bullets: {
        who: doc.summary?.bullets?.who ?? "",
        what: doc.summary?.bullets?.what ?? "",
        when: doc.summary?.bullets?.when ?? "",
        where: doc.summary?.bullets?.where ?? "",
        why: doc.summary?.bullets?.why ?? "",
      },
      colorNote: doc.summary?.colorNote ?? "",
      imageUrl: doc.imageUrl ?? undefined,
      publishedAt: publishedAt ?? "",
      source: doc.source ?? (url ? new URL(url).hostname.replace(/^www\./, "") : ""),
      sources: Array.isArray(doc.sources)
        ? doc.sources.map((src) => {
            try {
              const u = new URL(src);
              const host = u.hostname.replace(/^www\./, "");
              return { title: host, domain: host, url: src };
            } catch {
              // Fallback if src isn't a valid absolute URL
              const safe = (src || "").toString();
              return { title: safe, domain: safe, url: safe };
            }
          })
        : [],
    } satisfies SummaryItem;
  });

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Your Favorites</h1>

      {stories.length === 0 ? (
        <p className="text-center text-gray-500">
          You have no saved summaries{" "}
          <Link href="/">Browse summaries</Link> to add some.
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