"use client";
import React, { useState } from "react";
import type { SummaryItem } from "../types";
import StoryCard from "./StoryCard";

interface NewsTickerProps {
  initialSummaries?: SummaryItem[];
}

export default function NewsTicker({ initialSummaries = [] }: NewsTickerProps) {
  const [summaries, setSummaries] = useState<SummaryItem[]>(initialSummaries);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/news?page=${page + 1}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      // New API shape: { ok, stories: SummaryItem[], total }
      const json = (await res.json()) as { ok: boolean; stories: SummaryItem[]; total: number };
      const data = Array.isArray(json.stories) ? json.stories : [];
      if (data.length === 0) {
        setHasMore(false);
        return;
      }
      setSummaries(prev => [...prev, ...data]);
      setPage(prev => prev + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summaries.map((s, i) => {
          const key = (s as any).id != null ? (s as any).id : `summary-${i}`;
          return <StoryCard key={key} story={s} />;
        })}
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <div className="mt-6 flex justify-center">
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        )}
        {!hasMore && (
          <p className="mt-6 text-center text-gray-500">No more summaries</p>
        )}
      </div>
    </>
  );
}