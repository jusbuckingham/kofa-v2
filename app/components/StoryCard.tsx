"use client";

import React, { useId, useState } from "react";
import { FiBookmark, FiShare2, FiExternalLink } from "react-icons/fi";
import Link from "next/link";
import Image from "next/image";
import type { NewsStory, SummaryItem } from "../types";

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

interface StoryCardProps {
  story: NewsStory | SummaryItem;
  isSaved?: boolean;
  onSaved?: (storyId: string) => void;
}

export default function StoryCard({
  story,
  isSaved,
  onSaved,
}: StoryCardProps) {
  const titleId = useId();

  const isLocked = isSummaryItem(story) ? Boolean(story.locked) : false;

  function enforceLen(s?: string, max = 120): string {
    if (!s) return "";
    return s.length > max ? s.slice(0, max - 1).trim() + "…" : s;
  }

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean>(Boolean(isSaved));

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
        const four = arr.slice(0, 4);
        while (four.length < 4) four.push("");
        return four.map((b) => enforceLen(b));
      })()
    : [];

  return (
    <article
      aria-labelledby={titleId}
      className="relative w-full max-w-md p-6 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm bg-white/75 dark:bg-zinc-900/60 backdrop-blur transition hover:shadow-md hover:-translate-y-0.5 focus-within:ring-2 ring-blue-500/70 fade-in"
      role="group"
    >
      <h2 id={titleId} className="text-lg font-semibold mb-2 leading-snug text-gray-900 dark:text-gray-100">
        {story.title}
      </h2>

      {story.imageUrl && (
        <StoryImage src={story.imageUrl!} alt={story.title} />
      )}

      {isSummaryItem(story) && (
        <>
          <ul className={`list-disc list-inside marker:text-gray-400 dark:marker:text-gray-500 space-y-2 mb-3 text-[0.95rem] leading-relaxed ${isLocked ? "blur-sm select-none pointer-events-none" : ""}`}>
            {bullets.map((text, idx) => (
              <li key={idx} className="truncate" title={text}>{text}</li>
            ))}
          </ul>
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
      {"url" in story && story.url && (
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          Source:{" "}
          <a
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline hover:no-underline"
          >
            {hostFromUrl(story.url) || "Original"}
            <FiExternalLink className="w-3 h-3 opacity-80" />
          </a>
        </p>
      )}

      {isLocked && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 pointer-events-none rounded-lg" />
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