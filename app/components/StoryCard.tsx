"use client";

import React, { useState, useId } from "react";
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
  onSaved?: (storyId: string | number) => void;
  onPaywall?: (context?: { storyId: string | number }) => void; // trigger paywall modal instead of hard redirect
}

export default function StoryCard({
  story,
  isSaved = false,
  onSaved,
  onPaywall,
}: StoryCardProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isSaved);
  const [reading, setReading] = useState(false);
  const [readsLeft, setReadsLeft] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const titleId = useId();

  /**
   * Attempt to consume a daily read *and* record it in one call.
   * Endpoint suggestion: POST /api/user/metadata/read (you currently POST to /api/user/metadata;
   * adjust URL below when you implement a dedicated endpoint).
   * The endpoint should return:
   *   { allowed: boolean; dailyCount: number; totalReads: number; maxFree: number }
   */
  async function attemptConsumeRead(storyId: string | number) {
    // Using your existing POST /api/user/metadata for now.
    const res = await fetch("/api/user/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId }),
    });
    if (!res.ok) {
      throw new Error(`Read request failed (${res.status})`);
    }
    return (await res.json()) as {
      allowed?: boolean; // future shape
      dailyCount: number;
      totalReads?: number;
      maxFree?: number;
    };
  }

  async function handleRead() {
    if (reading) return;
    setReading(true);
    setReadError(null);

    try {
      // First lightweight *quota check* (GET) — consider removing once you implement dedicated POST read endpoint.
      const quotaRes = await fetch("/api/user/metadata");
      if (!quotaRes.ok) throw new Error("Unable to check read limit");
      const {
        dailyCount,
        maxFree = 3,
      } = (await quotaRes.json()) as { dailyCount: number; maxFree?: number };

      if (dailyCount >= maxFree) {
        // Trigger paywall UI instead of redirect
        if (onPaywall) {
          onPaywall({ storyId: story.id });
        } else {
          // fallback redirect
          window.location.href = "/pricing";
        }
        return;
      }

      // Record read & get updated counts
      const result = await attemptConsumeRead(story.id);
      const updatedDaily = result.dailyCount;
      setReadsLeft(Math.max((result.maxFree ?? maxFree) - updatedDaily, 0));

      // Broadcast metadata update globally (optional listener in dashboard)
      window.dispatchEvent(
        new CustomEvent("metadataUpdated", {
          detail: {
            dailyCount: updatedDaily,
            totalReads: result.totalReads,
            maxFree: result.maxFree ?? maxFree,
          },
        })
      );

      // Open original article in new tab
      if (story.url) {
        window.open(story.url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to open story";
      setReadError(message);
    } finally {
      setReading(false);
    }
  }

  async function handleSave() {
    if (saving || saved) return;
    setSaving(true);
    setSaveError(false);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      onSaved?.(story.id);
      window.dispatchEvent(
        new CustomEvent("favoriteAdded", { detail: { id: story.id } })
      );
    } catch (e) {
      console.error("Failed to save story", e);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  /**
   * Optional fields may or may not exist on NewsStory.  We avoid casting the entire
   * object to a dictionary (which causes TS2352 errors because NewsStory lacks an
   * index signature) by using a tiny type guard.
   */
  function pickString<K extends string>(
    obj: unknown,
    key: K
  ): string | undefined {
    if (
      typeof obj === "object" &&
      obj !== null &&
      Object.prototype.hasOwnProperty.call(obj, key)
    ) {
      const v = (obj as Record<K, unknown>)[key];
      return typeof v === "string" ? v : undefined;
    }
    return undefined;
  }

  const summary = pickString(story, "summary") ?? story.description;
  const source = pickString(story, "source");
  const category = pickString(story, "category");

  return (
    <article
      aria-labelledby={titleId}
      className="relative w-full max-w-md p-5 border rounded-lg shadow-sm bg-white/70 dark:bg-zinc-900/60 backdrop-blur transition
                 hover:shadow-md focus-within:shadow-md focus-within:ring-2 ring-blue-500
                 fade-in"
      role="group"
    >
      {/* Category / Source Row */}
      {(source || category) && (
        <div className="mb-2 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
          {source && (
            <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 font-medium">
              {source}
            </span>
          )}
          {category && (
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {category}
            </span>
          )}
        </div>
      )}

      {/* Title */}
      <h2
        id={titleId}
        className="text-lg font-semibold mb-2 leading-snug text-gray-900 dark:text-gray-100"
      >
        {story.title}
      </h2>

      {/* Summary */}
      {summary && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          {summary}
        </p>
      )}

      {/* External Link (non-metered small link) */}
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

      {/* Actions */}
      <div className="flex items-center gap-3">
        {story.url && (
          <button
            onClick={handleRead}
            disabled={reading}
            className={`relative inline-flex items-center px-3 py-1.5 rounded
              text-sm font-medium transition
              ${
                reading
                  ? "bg-blue-300 text-white cursor-default"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
          >
            {reading && (
              <Spinner className="h-4 w-4 mr-2 text-white" ariaLabel="Loading" />
            )}
            Read
            {readsLeft !== null && (
              <span className="ml-2 text-[10px] font-normal opacity-80">
                {readsLeft} free read{readsLeft === 1 ? "" : "s"} left
              </span>
            )}
          </button>
        )}

        <button
            onClick={handleSave}
            disabled={saved || saving}
            className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium transition
              ${
                saved
                  ? "bg-gray-400 text-white cursor-default"
                  : saving
                  ? "bg-green-400 text-white cursor-wait"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            aria-pressed={saved}
          >
            {saving && <Spinner className="h-4 w-4 mr-2 text-white" ariaLabel="Saving" />}
            {saved ? "Saved" : saving ? "Saving…" : "Save"}
          </button>
      </div>

      {/* Inline feedback */}
      <div className="mt-3 min-h-[1rem] text-xs">
        {readError && (
          <p className="text-red-600 dark:text-red-400" role="alert">
            {readError}
          </p>
        )}
        {saveError && !saved && (
          <button
            onClick={handleSave}
            className="text-red-600 dark:text-red-400 underline"
          >
            Retry save
          </button>
        )}
      </div>

      {/* Saved visual marker */}
      {saved && (
        <div
          className="absolute top-2 right-2 h-3 w-3 rounded-full bg-green-500"
          aria-label="Story saved"
          title="Story saved"
        />
      )}
    </article>
  );
}

/* Reusable spinner component (keeps markup tidy) */
function Spinner({
  className = "h-4 w-4",
  ariaLabel = "Loading",
}: {
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label={ariaLabel}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
      />
    </svg>
  );
}