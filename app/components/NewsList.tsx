'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import StoryCard from './StoryCard';
import SkeletonCard from './SkeletonCard';
import type { SummaryItem } from '../types';

type GetResponse = {
  ok: boolean;
  stories: SummaryItem[];
  total: number;
  hasMore: boolean;
  limit: number;
  offset: number;
  // optional filters, quota, etc. ignored here
};

const PAGE_SIZE = 7;              // fetch 7 at a time
const FREE_VISIBLE_LIMIT = 7;     // show 7 unblurred for non-subscribers

export default function NewsList() {
  const { data: session } = useSession();
  const isPro = Boolean(session?.user?.hasActiveSub);
  const [items, setItems] = useState<SummaryItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const firstLoadRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReqOffset, setLastReqOffset] = useState<number>(0);

  // fetch page
  const fetchPage = async (nextOffset: number): Promise<void> => {
    setLastReqOffset(nextOffset);
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(nextOffset),
        sort: 'publishedAt',
      });
      const res = await fetch(`/api/news/get?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!res.ok) {
        setError(`Failed to load stories (status ${res.status}).`);
        return;
      }
      try {
        const data: GetResponse = await res.json();
        setItems((prev) => {
          const merged = nextOffset === 0 ? data.stories : [...prev, ...data.stories];
          const unique = Array.from(new Map(merged.map((s) => [s.id, s])).values());
          return unique;
        });
        setHasMore(data.hasMore);
        setOffset(nextOffset + PAGE_SIZE);
      } catch {
        setError('Failed to parse stories data.');
      }
    } catch {
      setError('Network error while fetching stories.');
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    if (firstLoadRef.current) return;
    firstLoadRef.current = true;
    fetchPage(0);
  }, []);

  // how many can be shown without blur
  const visibleFreeCount: number = useMemo(() => (isPro ? Number.POSITIVE_INFINITY : FREE_VISIBLE_LIMIT), [isPro]);

  const handleLoadMore = () => {
    // IMPORTANT: keep paging even if the next items will be locked
    if (!loading && hasMore) fetchPage(offset);
  };

  const nothingYet = !loading && items.length === 0;

  return (
    <div className="mx-auto max-w-4xl">
      {error && (
        <div
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
          aria-live="polite"
        >
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => fetchPage(lastReqOffset || 0)}
            className="inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 shadow-sm transition hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}
      {/* Empty state */}
      {nothingYet && (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-neutral-600 shadow-sm">
          <p className="font-medium">No stories found right now.</p>
          <p className="mt-1 text-sm">Try again in a bit.</p>
        </div>
      )}

      {/* List */}
      <ul className="space-y-6">
        {items.map((summary, idx) => {
          const locked = !isPro && idx >= visibleFreeCount;
          return (
            <li key={summary.id}>
              <StoryCard summary={summary} locked={locked} />
            </li>
          );
        })}

        {/* Loading skeletons */}
        {loading &&
          Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <li key={`skeleton-${i}`}>
              <SkeletonCard />
            </li>
          ))}
      </ul>

      {/* Load more */}
      {hasMore && (
        <div className="mt-8 flex items-center justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            aria-busy={loading}
            aria-disabled={loading}
            className="inline-flex items-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {/* Hint for free users */}
      {!isPro && items.length >= visibleFreeCount && (
        <p className="mt-4 text-center text-xs text-neutral-500">
          You’ve reached your {FREE_VISIBLE_LIMIT} free summaries. Keep browsing—extra stories are blurred. Upgrade to see everything.
        </p>
      )}
    </div>
  );
}