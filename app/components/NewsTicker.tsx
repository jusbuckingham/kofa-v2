"use client";
import React, { useEffect, useRef, useState } from "react";
import type { SummaryItem } from "../types";
import StoryCard from "./StoryCard";

interface NewsResponse { ok: boolean; stories: SummaryItem[]; total: number }
interface QuotaResponse { remaining: number | null; limit: number | null; hasActiveSub: boolean }

interface NewsTickerProps {
  initialSummaries?: SummaryItem[];
}

// Helper to merge and de‑duplicate by a stable key (id fallback to url)
function mergeUnique(prev: SummaryItem[], next: SummaryItem[]): SummaryItem[] {
  const map = new Map<string, SummaryItem>();
  const put = (s: SummaryItem) => {
    const k = (s.id ?? s.url).toString();
    if (!map.has(k)) map.set(k, s);
  };
  prev.forEach(put);
  next.forEach(put);
  return Array.from(map.values());
}

export default function NewsTicker({ initialSummaries = [] }: NewsTickerProps) {
  const [summaries, setSummaries] = useState<SummaryItem[]>(initialSummaries);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasActiveSub, setHasActiveSub] = useState<boolean>(false);
  const [freeLimit, setFreeLimit] = useState<number>(7); // align with product policy

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const hasInitial = useRef<boolean>(initialSummaries.length > 0);

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
    const ac = new AbortController();
    try {
      const res = await fetch(`/api/news/get?page=${page + 1}`, { cache: 'no-store', signal: ac.signal });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      // New API shape: { ok, stories: SummaryItem[], total }
      const json: NewsResponse = await res.json();
      const data = Array.isArray(json.stories) ? json.stories : [];
      if (data.length === 0) {
        setHasMore(false);
        return;
      }
      setSummaries(prev => mergeUnique(prev, data));
      setPage(prev => prev + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      ac.abort();
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    (async () => {
      try {
        // Fetch quota (free limit & subscription)
        const q = await fetch('/api/user/read', { cache: 'no-store', signal: ac.signal });
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
        const f = await fetch('/api/favorites', { cache: 'no-store', signal: ac.signal });
        if (f.ok) {
          const favs = (await f.json()) as { id: string }[];
          if (!cancelled) setSavedIds(new Set(favs.map(x => x.id).filter(Boolean)));
        }
      } catch { /* ignore */ }
      // If no initial summaries were provided, fetch the first page so the ticker isn't empty.
      if (!cancelled && !hasInitial.current) {
        try {
          setLoading(true);
          const r0 = await fetch('/api/news/get?page=1', { cache: 'no-store', signal: ac.signal });
          if (r0.ok) {
            const j0: NewsResponse = await r0.json();
            const data0 = Array.isArray(j0.stories) ? j0.stories : [];
            setSummaries(prev => mergeUnique(prev, data0));
            setHasMore(data0.length > 0);
            setPage(1);
          }
        } catch { /* ignore */ }
        finally {
          hasInitial.current = true;
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; ac.abort(); };
  }, []);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summaries.map((s, i) => {
          const key = (s.id ?? s.url ?? `summary-${i}`).toString();
          const shouldLock = !hasActiveSub && i >= freeLimit;
          const storyWithLock = ({ ...s, locked: shouldLock });
          return (
            <StoryCard
              key={key}
              story={storyWithLock}
              isSaved={savedIds.has((s.id ?? s.url)?.toString() ?? "")}
              onSaved={handleSavedToggle}
            />
          );
        })}
      </div>
      {error && (
        <div className="mt-4 flex items-center justify-center gap-3 text-red-600">
          <span>{error}</span>
          <button
            onClick={loadMore}
            className="rounded border border-red-300 px-3 py-1 text-sm hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}
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