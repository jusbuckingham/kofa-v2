// app/dashboard/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ObjectId } from "mongodb";

import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import type { SummaryItem } from "@/types";
import StoryCard from "@/components/StoryCard";
import CleanUrlClient from "@/components/CleanUrlClient";
import RemoveFavoriteButton from "@/components/RemoveFavoriteButton";

// Shape of the story as stored in MongoDB
interface StoryDoc {
  _id: ObjectId;
  title?: string;
  url?: string;
  summary?: {
    oneLiner?: string;
    bullets?: string[];
  };
  imageUrl?: string;
  publishedAt?: Date | string;
  source?: string;
  sources?: string[];
}

export default async function DashboardPage() {
  // ===== Auth guard =====
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/signin");
  }

  const email = session.user.email.trim().toLowerCase();

  // ===== DB =====
  const dbName = process.env.MONGODB_DB_NAME || "kofa";
  const client = await clientPromise;
  const db = client.db(dbName);

  // ===== Load favorites =====
  const favDocs = await db
    .collection<{ email: string; storyId: string }>("favorites")
    .find({ email })
    .toArray();

  if (favDocs.length === 0) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <CleanUrlClient />
        <h1 className="text-2xl font-bold mb-4">Your Favorites</h1>
        <p className="text-center text-gray-500">
          You have no saved summaries.&nbsp;
          <Link href="/" className="underline hover:text-gray-700 dark:hover:text-gray-200">
            Browse summaries
          </Link>
          &nbsp;to add some.
        </p>
      </main>
    );
  }

  // ===== Fetch stories by ID =====
  const ids = favDocs.map((f) => new ObjectId(f.storyId));
  const storyDocs = await db
    .collection<StoryDoc>("stories")
    .find({ _id: { $in: ids } })
    .sort({ publishedAt: -1 })
    .toArray();

  // ===== Map to SummaryItem =====
  const stories: SummaryItem[] = storyDocs.map((doc) => {
    const url = doc.url ?? "";
    const publishedAt =
      doc.publishedAt instanceof Date
        ? doc.publishedAt.toISOString()
        : typeof doc.publishedAt === "string"
        ? doc.publishedAt
        : "";

    return {
      id: doc._id.toString(),
      title: doc.title ?? "Untitled",
      url,
      oneLiner: doc.summary?.oneLiner ?? "",
      bullets: Array.isArray(doc.summary?.bullets)
        ? doc.summary!.bullets.slice(0, 4)
        : ["", "", "", ""],
      colorNote: "",
      imageUrl: doc.imageUrl ?? undefined,
      publishedAt,
      source: doc.source ?? (url ? new URL(url).hostname.replace(/^www\./, "") : ""),
      sources: Array.isArray(doc.sources)
        ? doc.sources.map((src) => {
            try {
              const u = new URL(src);
              const host = u.hostname.replace(/^www\./, "");
              return { title: host, domain: host, url: src };
            } catch {
              const safe = String(src ?? "");
              return { title: safe, domain: safe, url: safe };
            }
          })
        : [],
    } satisfies SummaryItem;
  });

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <CleanUrlClient />
      <h1 className="text-2xl font-bold mb-4">Your Favorites</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => (
          <div key={story.id} className="relative">
            <StoryCard story={story} isSaved />
            <RemoveFavoriteButton storyId={story.id} className="absolute top-2 right-2" />
          </div>
        ))}
      </div>
    </main>
  );
}