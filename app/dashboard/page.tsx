// app/dashboard/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ObjectId } from "mongodb";

import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongoClient";
import type { SummaryItem } from "@/types";
import StoryCard from "@/components/StoryCard";
import CleanUrlClient from "@/components/CleanUrlClient";
import RemoveFavoriteButton from "@/components/RemoveFavoriteButton";

// Shape of the story as stored in MongoDB
interface StoryDoc {
  _id: ObjectId;
  title?: string;
  url?: string;
  // New top-level fields written by fetch route
  oneLiner?: string;
  bullets?: string[];
  // Legacy nested summary for back-compat
  summary?: {
    oneLiner?: string;
    bullets?: string[];
  };
  imageUrl?: string;
  publishedAt?: Date | string;
  source?: string;
  sources?: Array<
    | string
    | {
        title?: string;
        domain?: string;
        url?: string;
      }
  >;
}

interface FavoriteDoc { email: string; storyId: string }

export default async function DashboardPage() {
  // ===== Auth guard =====
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/signin");
  }

  const email = session.user.email.trim().toLowerCase();

  // ===== DB =====
  const db = await getDb();

  // ===== Load favorites =====
  const favDocs: FavoriteDoc[] = await db
    .collection<FavoriteDoc>("favorites")
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
  const ids = favDocs.map((f: FavoriteDoc) => new ObjectId(f.storyId));
  const validIds = ids.filter((id: ObjectId) => ObjectId.isValid(id));
  if (validIds.length === 0) {
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
  const storyDocs = await db
    .collection<StoryDoc>("stories")
    .find({ _id: { $in: validIds } })
    .sort({ publishedAt: -1 })
    .toArray();

  // ===== Map to SummaryItem =====
  const stories: SummaryItem[] = storyDocs.map((doc: StoryDoc) => {
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
      oneLiner: (doc.oneLiner ?? doc.summary?.oneLiner ?? "").trim(),
      bullets: (() => {
        const b = Array.isArray(doc.bullets)
          ? doc.bullets
          : Array.isArray(doc.summary?.bullets)
          ? doc.summary!.bullets
          : [];
        const four = b.slice(0, 4);
        while (four.length < 4) four.push("");
        return four;
      })(),
      colorNote: "",
      imageUrl: doc.imageUrl ?? undefined,
      publishedAt,
      source: doc.source ?? (url ? new URL(url).hostname.replace(/^www\./, "") : ""),
      sources: Array.isArray(doc.sources)
        ? (doc.sources as NonNullable<StoryDoc["sources"]>).map((src: StorySourceEntry) => {
            if (typeof src === "object" && src !== null) {
              const t = String(src.title ?? "");
              const d = String(src.domain ?? (src.url ? new URL(src.url).hostname.replace(/^www\./, "") : t));
              const u = String(src.url ?? "");
              return { title: t || d, domain: d, url: u };
            }
            const safe = String(src ?? "");
            try {
              const u = new URL(safe);
              const host = u.hostname.replace(/^www\./, "");
              return { title: host, domain: host, url: safe };
            } catch {
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
type StorySourceEntry = NonNullable<StoryDoc["sources"]>[number];