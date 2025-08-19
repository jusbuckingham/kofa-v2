"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { SummaryItem } from "../types";
import StoryCard from "./StoryCard";

interface NewsListProps {
  initialSummaries?: Array<SummaryItem>;
  savedIds?: Array<string | number>;
}

export default function NewsList({
  initialSummaries = [],
  savedIds = [],
}: NewsListProps) {
  const [summaries, setSummaries] = useState<Array<SummaryItem>>(initialSummaries);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const [hasActiveSub, setHasActiveSub] = useState<boolean>(false);
  const [freeLimit, setFreeLimit] = useState<number>(3);

  // Ensure we always have a Set to call .has on, even if an array was passed from the server
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/news?page=${page + 1}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      // New API shape: { ok: boolean, stories: SummaryItem[], total: number, quota?: any }
      const json = (await res.json()) as { ok: boolean; stories: Array<SummaryItem>; total: number };
      const data = Array.isArray(json.stories) ? json.stories : [];

      if (totalCount === null) {
        setTotalCount(json.total);
      }

      if (data.length === 0) {
        setHasMore(false);
      } else {
        setSummaries((prev) => [...prev, ...data]);
        const nextPage = page + 1;
        const loaded = summaries.length + data.length;
        const total = json.total ?? loaded;
        if (loaded >= total) {
          setHasMore(false);
        }
        setPage(nextPage);
      }
    } catch (err: unknown) {
      setError(
        err instanceof TypeError
          ? "Network error, check your connection and try again."
          : "Something went wrong, please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/read', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setHasActiveSub(Boolean(data?.hasActiveSub));
          if (typeof data?.limit === 'number') setFreeLimit(data.limit);
        }
      } catch {
        // ignore network errors; fallback defaults apply
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {summaries.map((summary, idx) => {
          const shouldLock = !hasActiveSub && idx >= freeLimit;
          const storyWithLock = ('oneLiner' in summary)
            ? ({ ...summary, locked: shouldLock } as SummaryItem)
            : summary;
          return (
            <div key={summary.id ?? idx} className="fade-in">
              <StoryCard story={storyWithLock} isSaved={savedSet.has(summary.id)} />
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col items-center">
        {error ? (
          <>
            <p className="text-red-500 mb-2">{error}</p>
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              {loading ? "Retrying..." : "Retry"}
            </button>
          </>
        ) : hasMore ? (
          <button
            onClick={loadMore}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && (
              <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" className="opacity-75" />
              </svg>
            )}
            <span>{loading ? "Loading..." : "Load more"}</span>
          </button>
        ) : (
          <p className="text-gray-500">No more summaries</p>
        )}
      </div>

      <style jsx>{`
        .fade-in { animation: fadein 0.5s ease-in-out; }
        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}