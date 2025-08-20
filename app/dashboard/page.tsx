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
import { stripe } from "@/lib/stripe";
import { useEffect } from "react";

function CleanUrlClient() {
  'use client';
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('session_id')) {
        url.searchParams.delete('session_id');
        const qs = url.searchParams.toString();
        const next = url.pathname + (qs ? `?${qs}` : '') + (url.hash || '');
        window.history.replaceState({}, '', next);
      }
    } catch {
      // noop
    }
  }, []);
  return null;
}

// Shape of the story as stored in MongoDB
type StoryDoc = {
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
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // ===== Session Check =====
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/signin');
  }

  // ===== Optional: Activate subscription after Stripe checkout redirect =====
  let flashMessage: string | null = null;
  const sessionIdRaw = searchParams?.session_id;
  const sessionId = Array.isArray(sessionIdRaw) ? sessionIdRaw[0] : sessionIdRaw;

  if (sessionId) {
    try {
      const cs = await stripe.checkout.sessions.retrieve(sessionId);
      const statusOk = cs.status === 'complete' || cs.payment_status === 'paid';
      const isSub = cs.mode === 'subscription' && !!cs.subscription;
      const customerId = typeof cs.customer === 'string' ? cs.customer : cs.customer?.id;

      if ((statusOk || isSub) && customerId) {
        const dbName = process.env.MONGODB_DB_NAME || 'kofa';
        const client = await clientPromise;
        const db = client.db(dbName);

        const email = session.user.email.trim().toLowerCase();
        // Update user_metadata (or create) and optionally users collection
        await db.collection('user_metadata').updateOne(
          { email },
          { $set: { email, hasActiveSub: true, stripeCustomerId: customerId, updatedAt: new Date() } },
          { upsert: true }
        );
        await db.collection('users').updateOne(
          { email },
          { $set: { stripeCustomerId: customerId } }
        );

        flashMessage = 'Subscription activated. Welcome to Kofa Pro!';
      }
    } catch {
      // Non-fatal: still render dashboard
      flashMessage = null;
    }
  }

  // ===== Database Setup =====
  const dbName = process.env.MONGODB_DB_NAME || 'kofa';
  const client = await clientPromise;
  const db = client.db(dbName);

  // ===== Fetch User's Favorite Story IDs =====
  const favDocs = await db
    .collection<{ email: string; storyId: string }>('favorites')
    .find({ email: session.user.email.trim().toLowerCase() })
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
      bullets: (() => {
        const raw = Array.isArray(doc.summary?.bullets) ? doc.summary?.bullets : [];
        const four = raw.slice(0, 4);
        while (four.length < 4) four.push("");
        return four;
      })(),
      colorNote: "",
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
      <CleanUrlClient />
      {flashMessage && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-2 text-green-800 dark:border-green-900/40 dark:bg-green-900/30 dark:text-green-200">
          {flashMessage}
        </div>
      )}
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
              <StoryCard story={story} isSaved={true} />
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