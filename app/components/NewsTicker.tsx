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
// This is generic for any item with id or url.
function mergeUnique<T extends { id?: string | number; url?: string }>(prev: T[], next: T[]): T[] {
  const map = new Map<string, T>();
  const put = (s: T) => {
    const k = (s.id ?? s.url)?.toString();
    if (k && !map.has(k)) map.set(k, s);
  };
  prev.forEach(put);
  next.forEach(put);
  return Array.from(map.values());
}

export default function NewsTicker({ initialSummaries = [] }: NewsTickerProps): JSX.Element {
  const [summaries, setSummaries] = useState<SummaryItem[]>(initialSummaries);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasActiveSub, setHasActiveSub] = useState<boolean>(false);
  const [freeLimit, setFreeLimit] = useState<number>(7); // align with product policy

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const hasInitial = useRef<boolean>(initialSummaries.length > 0);

  // Toggle saved story IDs
  const handleSavedToggle = (id: string): void => {
    setSavedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Load more stories (next page); disables loading on error or no more data.
  const loadMore = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    const ac = new AbortController();
    try {
      const res = await fetch(`/api/news/get?page=${page + 1}`, { cache: 'no-store', signal: ac.signal });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      // New API shape: { ok, stories: SummaryItem[], total }
      const json = (await res.json()) as unknown;
      // Validate NewsResponse shape
      const data = Array.isArray((json as NewsResponse)?.stories)
        ? (json as NewsResponse).stories
        : [];
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
      // No need to abort here; aborting in finally can cancel the just-completed fetch.
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;
    (async () => {
      try {
        // Fetch quota (free limit & subscription count/limit)
        const q = await fetch('/api/user/read', { cache: 'no-store', signal: ac.signal });
        if (q.ok) {
          const data = (await q.json()) as unknown;
          if (!cancelled) {
            // Quota logic: set freeLimit and subscription status.
            setHasActiveSub(Boolean((data as QuotaResponse)?.hasActiveSub));
            if (typeof (data as QuotaResponse)?.limit === 'number') setFreeLimit((data as QuotaResponse).limit!);
          }
        }
      } catch {
        // ignore quota error
      }

      try {
        // Fetch saved favorites to pre-mark cards
        const f = await fetch('/api/favorites', { cache: 'no-store', signal: ac.signal });
        if (f.ok) {
          const favs = (await f.json()) as unknown;
          // Saved IDs logic: only use string ids
          if (!cancelled && Array.isArray(favs)) {
            setSavedIds(new Set((favs as { id?: string }[]).map(x => x.id).filter(Boolean) as string[]));
          }
        }
      } catch {
        // ignore favorites error
      }
      // If no initial summaries were provided, fetch the first page so the ticker isn't empty.
      if (!cancelled && !hasInitial.current) {
        try {
          setLoading(true);
          const r0 = await fetch('/api/news/get?page=1', { cache: 'no-store', signal: ac.signal });
          if (r0.ok) {
            const j0 = (await r0.json()) as unknown;
            const data0 = Array.isArray((j0 as NewsResponse)?.stories)
              ? (j0 as NewsResponse).stories
              : [];
            setSummaries(prev => mergeUnique(prev, data0));
            setHasMore(data0.length > 0);
            setPage(1);
          }
        } catch {
          // ignore initial fetch error
        } finally {
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
          // Quota logic: lock stories above freeLimit unless subscribed.
          const shouldLock = !hasActiveSub && i >= freeLimit;
          // Ensure type safety for locked property.
          const storyWithLock: SummaryItem & { locked?: boolean } = { ...s, locked: shouldLock };
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