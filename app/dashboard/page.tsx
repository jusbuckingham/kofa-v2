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

function EmptyState() {
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
    return <EmptyState />;
  }

  // ===== Fetch stories by ID =====
  // Validate first (ObjectId() throws on bad input), then convert.
  const validIds: ObjectId[] = favDocs
    .map((f) => f.storyId?.trim())
    .filter((id): id is string => Boolean(id) && ObjectId.isValid(id as string))
    .map((id) => new ObjectId(id));

  if (validIds.length === 0) {
    return <EmptyState />;
  }

  let storyDocs: StoryDoc[] = [];
  try {
    const pipeline = [
      { $match: { _id: { $in: validIds } } },
      {
        $addFields: {
          _pubDate: {
            $let: {
              vars: { pa: "$publishedAt", ca: "$createdAt" },
              in: {
                $cond: [
                  { $eq: [{ $type: "$$pa" }, "date"] },
                  "$$pa",
                  {
                    $cond: [
                      { $eq: [{ $type: "$$pa" }, "string"] },
                      {
                        $dateFromString: {
                          dateString: "$$pa",
                          onError: { $ifNull: ["$$ca", new Date(0)] },
                          onNull: { $ifNull: ["$$ca", new Date(0)] },
                        },
                      },
                      { $ifNull: ["$$ca", new Date(0)] },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      { $sort: { _pubDate: -1, _id: -1 } },
      {
        $project: {
          _pubDate: 0,
          title: 1,
          url: 1,
          oneLiner: 1,
          bullets: 1,
          summary: 1,
          imageUrl: 1,
          publishedAt: 1,
          source: 1,
          sources: 1,
        },
      },
    ];

    storyDocs = (await db
      .collection<StoryDoc>("stories")
      .aggregate(pipeline)
      .toArray()) as StoryDoc[];
  } catch {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <CleanUrlClient />
        <h1 className="text-2xl font-bold mb-4">Your Favorites</h1>
        <p className="text-center text-gray-500">
          We couldn&apos;t load your saved summaries right now. Please try again shortly.
        </p>
      </main>
    );
  }

  type StorySourceEntry = NonNullable<StoryDoc["sources"]>[number];

  // ===== Map to SummaryItem =====
  const stories: SummaryItem[] = storyDocs
    .map((doc: StoryDoc) => {
      const url = doc.url ?? "";
      const publishedAt =
        doc.publishedAt instanceof Date
          ? doc.publishedAt.toISOString()
          : typeof doc.publishedAt === "string"
          ? doc.publishedAt
          : "";

      const safeHost = (() => {
        if (!url) return "";
        try {
          return new URL(url).hostname.replace(/^www\./, "");
        } catch {
          return "";
        }
      })();

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
        source: doc.source ?? safeHost,
        sources: Array.isArray(doc.sources)
          ? (doc.sources as NonNullable<StoryDoc["sources"]>).map((src: StorySourceEntry) => {
              if (typeof src === "object" && src !== null) {
                const t = String(src.title ?? "");
                const d = String(
                  src.domain ??
                    (src.url
                      ? (() => {
                          try {
                            return new URL(src.url as string).hostname.replace(/^www\./, "");
                          } catch {
                            return t;
                          }
                        })()
                      : t)
                );
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
    })
    // De-dupe by id just in case favorites contain duplicates
    .filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <CleanUrlClient />
      <h1 className="text-2xl font-bold mb-4">Your Favorites</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => (
          <div key={story.id} className="relative">
            <StoryCard summary={story} isSaved />
            <RemoveFavoriteButton storyId={story.id} className="absolute top-2 right-2" />
          </div>
        ))}
      </div>
    </main>
  );
}