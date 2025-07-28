"use client";

import React, { useState, useId, useEffect } from "react";
import Link from "next/link";
import type { NewsStory } from "../types";

/**
 * Extended NewsStory expectations (non-breaking):
 *  - summary?: string  (your culturally conscious summary; preferred over description)
 *  - source?: string   (publisher name)
 *  - category?: string (optional topical tag)
 */

interface StoryCardProps {
  story: NewsStory;
  isSaved?: boolean;
  onSaved?: (storyId: string) => void;
  onPaywall?: (context?: { storyId: string | number }) => void; // trigger paywall modal instead of hard redirect
}

export default function StoryCard({ story, isSaved = false, onSaved, onPaywall }: StoryCardProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isSaved);
  useEffect(() => {
    setSaved(isSaved);
  }, [isSaved]);
  const [reading, setReading] = useState(false);
  const [readsLeft, setReadsLeft] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [overLimit, setOverLimit] = useState(false);
  const MAX_FALLBACK_FREE = 3;
  const titleId = useId();

  /**
   * Hit the new quota endpoint that both checks and optionally increments the count.
   *   GET  /api/user/read        -> { readsToday, limit, allowed, hasActiveSub }
   *   POST /api/user/read        -> same payload, but increments when allowed
   */
  async function hitQuotaEndpoint(options: { increment: boolean; storyId?: string | number }) {
    const { increment, storyId } = options;
    const endpoint = "/api/user/read";
    const res = await fetch(endpoint, {
      method: increment ? "POST" : "GET",
      headers: increment ? { "Content-Type": "application/json" } : undefined,
      body: increment ? JSON.stringify({ increment: true, storyId }) : undefined,
      cache: "no-store",
    });

    if (res.status === 402) {
      // custom quota exceeded response
      const data = await res.json().catch(() => ({}));
      return { ...data, allowed: false } as {
        readsToday: number;
        limit: number;
        allowed: boolean;
        hasActiveSub?: boolean;
      };
    }

    if (!res.ok) {
      throw new Error(`Quota check failed (${res.status})`);
    }

    return (await res.json()) as {
      readsToday: number;
      limit: number;
      allowed: boolean;
      hasActiveSub?: boolean;
    };
  }

  async function handleRead() {
    if (reading || overLimit) return;
    setReading(true);
    setReadError(null);

    try {
      // Increment on the server and get the fresh numbers back
      const quota = await hitQuotaEndpoint({ increment: true, storyId: story.id });

      const limit = quota.limit ?? MAX_FALLBACK_FREE;
      const left = Math.max(limit - quota.readsToday, 0);
      setReadsLeft(left);
      setOverLimit(!quota.allowed || left === 0);

      // Broadcast update to anything listening (dashboard stats/banners)
      window.dispatchEvent(
        new CustomEvent("metadataUpdated", {
          detail: {
            dailyCount: quota.readsToday,
            maxFree: limit,
            totalReads: undefined, // not part of this endpoint but reserved
          },
        })
      );

      if (!quota.allowed) {
        if (onPaywall) {
          onPaywall({ storyId: story.id });
        } else {
          window.location.href = "/pricing";
        }
        return;
      }

      // Open original article
      if (story.url) {
        window.open(story.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to open story";
      setReadError(message);
    } finally {
      setReading(false);
    }
  }

  useEffect(() => {
    // Sync with global metadata events
    function onMeta(e: Event) {
      const detail = (e as CustomEvent<{ dailyCount: number; totalReads?: number; maxFree?: number }>).detail;
      if (!detail) return;
      const left = Math.max((detail.maxFree ?? MAX_FALLBACK_FREE) - detail.dailyCount, 0);
      setReadsLeft(left);
      setOverLimit(left === 0);
    }

    window.addEventListener("metadataUpdated", onMeta);
    return () => window.removeEventListener("metadataUpdated", onMeta);
  }, []);

  async function handleToggle() {
    if (saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      const method = saved ? 'DELETE' : 'POST';
      const res = await fetch('/api/favorites', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id }),
      });
      if (!res.ok) throw new Error('Favorite toggle failed');
      setSaved(!saved);
      onSaved?.(story.id);
      window.dispatchEvent(
        new CustomEvent(
          saved ? 'favoriteRemoved' : 'favoriteAdded',
          { detail: { id: story.id } }
        )
      );
    } catch (e) {
      console.error('Failed to toggle favorite', e);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: story.title, url: story.url });
      } else {
        await navigator.clipboard.writeText(story.url);
        alert('Link copied to clipboard');
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  }

  // Tiny type guard helper for optional fields on story
  function pickString<K extends string>(obj: unknown, key: K): string | undefined {
    if (typeof obj === "object" && obj !== null && Object.prototype.hasOwnProperty.call(obj, key)) {
      const v = (obj as Record<K, unknown>)[key];
      return typeof v === "string" ? v : undefined;
    }
    return undefined;
  }

  const summary = pickString(story, "summary") ?? "";
  const source = pickString(story, "source");
  const category = pickString(story, "category");

  return (
    <article
      aria-labelledby={titleId}
      className="relative w-full max-w-md p-5 border rounded-lg shadow-sm bg-white/70 dark:bg-zinc-900/60 backdrop-blur transition hover:shadow-md focus-within:shadow-md focus-within:ring-2 ring-blue-500 fade-in"
      role="group"
    >
      {(source || category) && (
        <div className="mb-2 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
          {source && (
            <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 font-medium">{source}</span>
          )}
          {category && (
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{category}</span>
          )}
        </div>
      )}

      <h2 id={titleId} className="text-lg font-semibold mb-2 leading-snug text-gray-900 dark:text-gray-100">
        {story.title}
      </h2>

      {summary && <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{summary}</p>}

      {story.url && (
        <div className="mb-4 text-xs">
          <Link
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
            onClick={(e) => e.stopPropagation()}
          >
            Original article →
          </Link>
        </div>
      )}

      <div className="flex items-center gap-3">
        {story.url && (
          <button
            onClick={overLimit ? () => (onPaywall ? onPaywall({ storyId: story.id }) : (window.location.href = "/pricing")) : handleRead}
            disabled={reading || overLimit}
            className={`relative inline-flex items-center px-3 py-1.5 rounded text-sm font-medium transition ${
              overLimit
                ? "bg-gray-400 text-white cursor-not-allowed"
                : reading
                ? "bg-blue-300 text-white cursor-default"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
            aria-disabled={reading || overLimit}
          >
            {reading && <Spinner className="h-4 w-4 mr-2 text-white" ariaLabel="Loading" />}
            {overLimit ? "Upgrade to continue" : "Read"}
            {readsLeft !== null && !overLimit && (
              <span className="ml-2 text-[10px] font-normal opacity-80">{readsLeft} free read{readsLeft === 1 ? "" : "s"} left</span>
            )}
          </button>
        )}

        <button
          onClick={handleToggle}
          disabled={saving}
          aria-pressed={saved}
          className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium transition ${
            saved
              ? 'bg-gray-400 text-white cursor-default'
              : saving
              ? 'bg-green-400 text-white cursor-wait'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {saving && <Spinner className="h-4 w-4 mr-2 text-white" ariaLabel="Saving" />}
          {saved ? '❤️ Saved' : saving ? 'Saving…' : '🤍 Save'}
        </button>
        <button
          onClick={handleShare}
          className="inline-flex items-center px-2 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
          aria-label="Share story"
        >
          🔗
        </button>
      </div>

      <div className="mt-3 min-h-[1rem] text-xs">
        {readError && (
          <p className="text-red-600 dark:text-red-400" role="alert">
            {readError}
          </p>
        )}
        {saveError && !saved && (
          <button onClick={handleToggle} className="text-red-600 dark:text-red-400 underline">
            Retry save
          </button>
        )}
      </div>

      {saved && (
        <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-green-500" aria-label="Story saved" title="Story saved" />
      )}
    </article>
  );
}

// Local tiny spinner
function Spinner({ className = "h-4 w-4", ariaLabel = "Loading" }: { className?: string; ariaLabel?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label={ariaLabel}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}