"use client";
import React, { useEffect, useState } from "react";
import type { SummaryItem } from "../types";
import StoryCard from "./StoryCard";

interface NewsResponse { ok: boolean; stories: SummaryItem[]; total: number }
interface QuotaResponse { remaining: number | null; limit: number | null; hasActiveSub: boolean }

interface NewsTickerProps {
  initialSummaries?: SummaryItem[];
}

export default function NewsTicker({ initialSummaries = [] }: NewsTickerProps) {
  const [summaries, setSummaries] = useState<SummaryItem[]>(initialSummaries);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasActiveSub, setHasActiveSub] = useState<boolean>(false);
  const [freeLimit, setFreeLimit] = useState<number>(3);

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const handleSavedToggle = (id: string) => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadMore = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/news?page=${page + 1}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      // New API shape: { ok, stories: SummaryItem[], total }
      const json: NewsResponse = await res.json();
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch quota (free limit & subscription)
        const q = await fetch('/api/user/read', { cache: 'no-store' });
        if (q.ok) {
          const data: QuotaResponse = await q.json();
          if (!cancelled) {
            setHasActiveSub(Boolean(data?.hasActiveSub));
            if (typeof data?.limit === 'number') setFreeLimit(data.limit);
          }
        }
      } catch { /* ignore */ }

      try {
        // Fetch saved favorites to pre-mark cards
        const f = await fetch('/api/favorites', { cache: 'no-store' });
        if (f.ok) {
          const favs = (await f.json()) as { id: string }[];
          if (!cancelled) setSavedIds(new Set(favs.map(x => x.id).filter(Boolean)));
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summaries.map((s, i) => {
          const key = s.id ?? `summary-${i}`;
          const shouldLock = !hasActiveSub && i >= freeLimit;
          const storyWithLock = ({ ...s, locked: shouldLock });
          return (
            <StoryCard
              key={key}
              story={storyWithLock}
              isSaved={savedIds.has(s.id)}
              onSaved={handleSavedToggle}
            />
          );
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