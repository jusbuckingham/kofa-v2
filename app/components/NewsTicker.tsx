"use client";
import React, { useEffect, useRef, useState } from "react";
import type { SummaryItem } from "../types";
import StoryCard from "./StoryCard";

interface NewsTickerProps {
  initialSummaries?: SummaryItem[];
}

interface NewsResponse { ok: boolean; stories: SummaryItem[]; total: number }
interface QuotaResponse { remaining: number | null; limit: number | null; hasActiveSub: boolean }

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

const parseDate = (d?: string | Date) => (d ? new Date(d) : new Date(0));
const sortByPublishedDesc = <T extends { publishedAt?: string | Date }>(arr: T[]): T[] =>
  [...arr].sort((a, b) => parseDate(b.publishedAt).getTime() - parseDate(a.publishedAt).getTime());

export default function NewsTicker({ initialSummaries = [] }: NewsTickerProps): JSX.Element {
  const [summaries, setSummaries] = useState<SummaryItem[]>(initialSummaries);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [hasActiveSub, setHasActiveSub] = useState<boolean>(false);
  const [freeLimit, setFreeLimit] = useState<number>(7); // align with product policy

  // In-flight and debounce guards
  const inFlightRef = useRef(false);
  const lastLoadTsRef = useRef(0);

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Ephemeral toast for network errors
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    // auto-hide after 3s
    window.setTimeout(() => setToast(null), 3000);
  };

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
    const now = Date.now();
    if (!hasMore) return;
    // simple debounce: ignore clicks within 600ms or if already in-flight
    if (inFlightRef.current || now - lastLoadTsRef.current < 600) return;
    lastLoadTsRef.current = now;
    inFlightRef.current = true;
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
      const ordered = sortByPublishedDesc(data);
      setSummaries(prev => mergeUnique(prev, ordered));
      setPage(prev => prev + 1);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : String(err));
      showToast(err instanceof Error ? err.message : String(err));
    } finally {
      inFlightRef.current = false;
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
            if (typeof (data as QuotaResponse)?.limit === 'number') {
              setFreeLimit((data as QuotaResponse).limit as number);
            } else {
              setFreeLimit(7);
            }
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
            setSavedIds(new Set((favs as { id?: string; url?: string }[])
              .map(x => (x.id ?? x.url)?.toString())
              .filter((v): v is string => Boolean(v))));
          }
        }
      } catch {
        // ignore favorites error
      }
      // If no initial summaries were provided, fetch the first page so the ticker isn't empty.
      if (!cancelled && !hasInitial.current) {
        try {
          if (inFlightRef.current) return;
          inFlightRef.current = true;
          setLoading(true);
          const r0 = await fetch('/api/news/get?page=1', { cache: 'no-store', signal: ac.signal });
          if (r0.ok) {
            const j0 = (await r0.json()) as unknown;
            const data0 = Array.isArray((j0 as NewsResponse)?.stories)
              ? (j0 as NewsResponse).stories
              : [];
            const ordered0 = sortByPublishedDesc(data0);
            setSummaries(prev => mergeUnique(prev, ordered0));
            setHasMore(data0.length > 0);
            setPage(1);
          }
        } catch {
          // ignore initial fetch error
        } finally {
          hasInitial.current = true;
          inFlightRef.current = false;
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
              summary={storyWithLock}
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
            aria-label="Load more summaries"
            onClick={loadMore}
            disabled={loading || !hasMore}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        )}
        {!hasMore && (
          <p className="mt-6 text-center text-gray-500">No more summaries</p>
        )}
      </div>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded bg-black/80 px-4 py-2 text-sm text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}