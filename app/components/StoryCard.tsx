"use client";

import React, { useId, useState } from "react";
import { FiBookmark, FiShare2 } from "react-icons/fi";
import Link from "next/link";
import Image from "next/image";
import type { NewsStory, SummaryItem } from "../types";
import formatDate from "../utils/formatDate";

const hostFromUrl = (u?: string) => {
  if (!u) return "";
  try {
    const h = new URL(u).hostname;
    return h.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function isSummaryItem(x: NewsStory | SummaryItem): x is SummaryItem {
  return (x as SummaryItem).oneLiner !== undefined;
}

interface StoryImageProps {
  src: string;
  alt: string;
}

function StoryImage({ src, alt }: StoryImageProps) {
  const isValid = /^https?:\/\//i.test(src) || src.startsWith("data:");
  if (!isValid) return null;
  return (
    <div className="mb-4 relative w-full h-52 rounded-lg overflow-hidden">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        unoptimized
      />
    </div>
  );
}

type StoryCardProps = {
  /**
   * Preferred prop: provide the story/summary data here.
   */
  summary: NewsStory | SummaryItem;

  isSaved?: boolean;
  onSaved?: (storyId: string) => void;
  locked?: boolean;
};

export default function StoryCard({ summary, isSaved, onSaved, locked }: StoryCardProps) {
  const story = summary;

  // Call hooks unconditionally (before any early returns)
  const titleId = useId();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(Boolean(isSaved));

  if (!story) return null;

  const isLocked = typeof locked === 'boolean' ? locked : (isSummaryItem(story) ? Boolean(story.locked) : false);

  function enforceLen(s?: string, max = 120): string {
    if (!s) return "";
    return s.length > max ? s.slice(0, max - 1).trim() + "…" : s;
  }

  const handleToggleSave = async () => {
    if (!("id" in story) || !story.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const method = saved ? "DELETE" : "POST";
      const res = await fetch("/api/favorites", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.id }),
      });
      if (!res.ok) throw new Error(`Failed to ${saved ? "remove" : "save"}`);
      setSaved(!saved);
      onSaved?.(story.id);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      if ("url" in story && story.url) {
        if (navigator.share) {
          await navigator.share({ title: story.title, url: story.url });
        } else {
          await navigator.clipboard.writeText(story.url);
        }
      }
    } catch {
      // best-effort
    }
  };

  const bullets = isSummaryItem(story)
    ? (() => {
        const arr = Array.isArray(story.bullets) ? story.bullets : [];
        return arr
          .filter((b): b is string => Boolean(b && b.trim()))
          .slice(0, 4)
          .map((b) => enforceLen(b));
      })()
    : [];

  return (
    <article
      aria-labelledby={titleId}
      className="relative w-full max-w-md p-5 border border-gray-200/70 dark:border-zinc-800/70 rounded-2xl shadow-sm bg-white/80 dark:bg-zinc-900/60 backdrop-blur transition hover:shadow-md hover:-translate-y-0.5 hover:bg-white/90 focus-within:ring-2 ring-blue-500/70 fade-in"
      role="group"
    >
      <h2
        id={titleId}
        className="text-xl md:text-2xl font-semibold tracking-tight leading-tight mb-2 text-gray-900 dark:text-gray-100"
      >
        {story.title}
      </h2>

      {story.imageUrl && (
        <StoryImage src={story.imageUrl} alt={story.title} />
      )}

      {( ("url" in story && story.url) || ("publishedAt" in story && story.publishedAt)) && (
        <div className="mb-3 -mt-1 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
          {"publishedAt" in story && story.publishedAt ? (
            <time dateTime={new Date(story.publishedAt).toISOString()}>
              {formatDate(story.publishedAt)}
            </time>
          ) : null}
          {("publishedAt" in story && story.publishedAt) && ("url" in story && story.url) ? (
            <span aria-hidden="true">•</span>
          ) : null}
          {"url" in story && story.url ? (
            <span>{hostFromUrl(story.url)}</span>
          ) : null}
        </div>
      )}

      {isSummaryItem(story) && (
        <>
          <div className="mb-3 rounded-md border border-gray-100 dark:border-zinc-800 bg-gray-50/80 dark:bg-zinc-800/40 px-3 py-2">
            <span className="sr-only">Summary</span>
            <ul
              aria-live="polite"
              className={`${
                isLocked ? "blur-sm select-none pointer-events-none" : ""
              } list-none space-y-2 text-[0.97rem] leading-relaxed`}
            >
              {bullets.map((text, idx) => (
                <li key={idx} className="flex items-start gap-3 whitespace-normal break-words tracking-tight" title={text}>
                  <span className="mt-[0.55rem] inline-block w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" aria-hidden="true" />
                  <span className="text-gray-800 dark:text-gray-200">{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mb-2" />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSave}
              disabled={saving}
              title={saved ? "Unsave" : "Save for later"}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed ${
                saved ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-zinc-800 dark:text-gray-100 dark:hover:bg-zinc-700"
              }`}
              aria-label={saved ? "Unsave this story" : "Save this story"}
            >
              <FiBookmark className={`w-4 h-4 ${saved ? "animate-pulse" : ""}`} />
              {saved ? "Saved" : "Save"}
            </button>

            <button
              type="button"
              onClick={handleShare}
              title="Share link"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition shadow-sm hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500/40"
              aria-label="Share this story"
            >
              <FiShare2 className="w-4 h-4" />
              Share
            </button>

            {saveError && (
              <span className="text-xs text-red-600" role="alert">{saveError}</span>
            )}
          </div>
        </>
      )}

      {isLocked && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 pointer-events-none rounded-2xl" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <div className="rounded-md bg-white/90 dark:bg-zinc-900/80 backdrop-blur border text-center py-2">
              <span className="mr-2 text-sm">Upgrade to see all summaries</span>
              <Link href="/pricing" className="inline-block rounded border px-3 py-1 text-sm">Go Pro</Link>
            </div>
          </div>
        </>
      )}
    </article>
  );
}