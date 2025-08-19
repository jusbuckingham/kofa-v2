"use client";

import React, { useState, useEffect, useId } from "react";
import Link from "next/link";
import Image from "next/image";
import type { NewsStory, SummaryItem } from "../types";
import formatDate from "../utils/formatDate";

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
    <div className="mb-4 relative w-full h-48">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover rounded-t-lg"
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
  isSaved = false,
  onSaved,
}: StoryCardProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(isSaved);
  useEffect(() => {
    setSaved(isSaved);
  }, [isSaved]);

  const [saveError, setSaveError] = useState(false);
  const titleId = useId();

  const isLocked = isSummaryItem(story) ? Boolean(story.locked) : false;

  function pickStringLoose(obj: unknown, key: string): string | undefined {
    const value = (obj as Record<string, unknown>)[key];
    return typeof value === "string" ? value : undefined;
  }

  function enforceLen(s?: string, max = 120): string {
    if (!s) return "";
    return s.length > max ? s.slice(0, max - 1).trim() + "…" : s;
  }

  const summary = pickStringLoose(story, "summary") ?? "";
  const source = pickStringLoose(story, "source");
  const category = pickStringLoose(story, "category");
  const dateStr = pickStringLoose(story, "publishedAt") ?? "";

  const oneLiner = isSummaryItem(story) ? enforceLen(story.oneLiner) : summary;
  const bullets = isSummaryItem(story)
    ? (['who', 'what', 'when', 'where', 'why'] as const).map((k) =>
        enforceLen((story.bullets as Record<string, string | undefined> | undefined)?.[k])
      )
    : [];
  const colorNote = isSummaryItem(story) ? story.colorNote ?? "" : "";
  const sources = isSummaryItem(story) ? story.sources ?? [] : [];

  async function handleToggle() {
    if (saving) return;
    setSaving(true);
    setSaveError(false);

    try {
      const method = saved ? "DELETE" : "POST";
      const res = await fetch("/api/favorites", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.id }),
      });
      if (!res.ok) throw new Error("Favorite toggle failed");
      setSaved(!saved);
      onSaved?.(story.id);
      window.dispatchEvent(
        new CustomEvent(saved ? "favoriteRemoved" : "favoriteAdded", {
          detail: { id: story.id },
        })
      );
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    try {
      if (navigator.share) await navigator.share({ title: story.title, url: story.url! });
      else {
        await navigator.clipboard.writeText(story.url ?? "");
        alert("Link copied to clipboard");
      }
    } catch {
      // no-op
    }
  }

  return (
    <article
      aria-labelledby={titleId}
      className="relative w-full max-w-md p-5 border rounded-lg shadow-sm bg-white/70 dark:bg-zinc-900/60 backdrop-blur transition hover:shadow-md focus-within:ring-2 ring-blue-500 fade-in"
      role="group"
    >
      {(source || category) && (
        <div className="mb-2 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
          {source && <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800">{source}</span>}
          {category && (
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/40">{category}</span>
          )}
        </div>
      )}

      <h2
        id={titleId}
        className="text-lg font-semibold mb-2 leading-snug text-gray-900 dark:text-gray-100"
      >
        {story.title}
      </h2>
      {dateStr && (
        <time
          dateTime={dateStr}
          className="text-xs text-gray-500 dark:text-gray-400 mb-2 block"
        >
          {formatDate(dateStr)}
        </time>
      )}

      {story.imageUrl && (
        <StoryImage src={story.imageUrl!} alt={story.title} />
      )}

      {oneLiner && (
        <p className="text-sm mb-3 text-gray-700 dark:text-gray-300">{oneLiner}</p>
      )}

      {isSummaryItem(story) && (
        <ul className={`list-disc list-inside space-y-1.5 mb-3 text-sm ${isLocked ? "blur-sm select-none pointer-events-none" : ""}`}>
          {bullets.map((text, idx) => (
            <li key={idx} className="truncate" title={text}>{text}</li>
          ))}
        </ul>
      )}

      {colorNote && (
        <p className={`text-xs italic border-l-2 pl-2 ${isLocked ? "blur-sm select-none pointer-events-none" : ""}`}>
          {colorNote}
        </p>
      )}

      {sources?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-neutral-500">
          {sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="underline opacity-70 hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              {s.domain?.replace(/^www\./, "") || "source"}
            </a>
          ))}
        </div>
      )}

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

        <button
          onClick={handleToggle}
          disabled={saving}
          aria-pressed={saved}
          className={`inline-flex items-center px-3 py-1.5 rounded text-sm font-medium transition ${
            saved
              ? "bg-gray-400 text-white"
              : saving
              ? "bg-green-400 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {saving && (
            <svg
              className="animate-spin h-4 w-4 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              role="status"
              aria-label="Saving"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
          )}
          {saved ? "❤️ Saved" : saving ? "Saving…" : "🤍 Save"}
        </button>

        <button
          onClick={handleShare}
          className="inline-flex items-center px-2 py-1 rounded text-sm hover:bg-gray-100 dark:hover:bg-zinc-800"
          aria-label="Share story"
        >
          🔗
        </button>
      </div>

      <div className="mt-3 min-h-[1rem] text-xs">
        {saveError && !saved && (
          <button onClick={handleToggle} className="text-red-600 underline">
            Retry save
          </button>
        )}
      </div>

      {saved && (
        <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-green-500" />
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