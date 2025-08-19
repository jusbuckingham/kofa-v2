// app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useQuota } from "@/components/ReadQuotaContext";
import ReadQuotaBanner from "@/components/ReadQuotaBanner";
import SkeletonCard from "@/components/SkeletonCard";
import StoryCard from "@/components/StoryCard";
import type { SummaryItem } from "@/types";

const LIMIT = 5;

export default function HomePage() {
  const { hasActiveSub } = useQuota();
  const [stories, setStories] = useState<SummaryItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [freeLimit, setFreeLimit] = useState(3);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());

  // Fetch stories
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/news/get?limit=${LIMIT}&offset=${offset}`);
        if (res.ok) {
          const data = (await res.json()) as { ok?: boolean; stories: SummaryItem[]; total: number; quota?: unknown };
          if (active) {
            setStories(prev => [...prev, ...data.stories]);
            setTotal(data.total);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [offset]);

  // Infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && offset + LIMIT < total) {
        setOffset(o => o + LIMIT);
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loading, total, offset]);

  // Load favorites
  useEffect(() => {
    async function loadFavs() {
      try {
        const res = await fetch('/api/favorites');
        if (res.ok) {
          const favs = (await res.json()) as SummaryItem[];
          setSavedSet(new Set(favs.map(s => s.id)));
        }
      } catch {}
    }
    loadFavs();
  }, []);

  // Favorite events
  useEffect(() => {
    const onAdded = (e: Event) => {
      const ev = e as CustomEvent<{ id: string }>;
      setSavedSet(prev => new Set(prev).add(ev.detail.id));
    };
    const onRemoved = (e: Event) => {
      const ev = e as CustomEvent<{ id: string }>;
      setSavedSet(prev => {
        const next = new Set(prev);
        next.delete(ev.detail.id);
        return next;
      });
    };
    window.addEventListener('favoriteAdded', onAdded);
    window.addEventListener('favoriteRemoved', onRemoved);
    return () => {
      window.removeEventListener('favoriteAdded', onAdded);
      window.removeEventListener('favoriteRemoved', onRemoved);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/read', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data?.limit === 'number') {
          setFreeLimit(data.limit);
        }
      } catch {
        // ignore; keep default
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="max-w-3xl mx-auto p-4">
      {!hasActiveSub && <ReadQuotaBanner />}
      <h2 className="text-2xl font-bold mb-4">Today&apos;s Top Summaries</h2>
      <ul className="space-y-6">
        {stories.map((story, idx) => {
          const shouldLock = !hasActiveSub && idx >= freeLimit;
          const storyWithLock = ({ ...story, locked: shouldLock }) as SummaryItem;
          return (
            <li key={story.id}>
              <StoryCard
                story={storyWithLock}
                isSaved={savedSet.has(story.id)}
                onSaved={(id: string) => {
                  setSavedSet(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
              />
            </li>
          );
        })}
        {loading &&
          Array.from({ length: LIMIT }).map((_, i) => (
            <li key={`skeleton-${i}`}>
              <SkeletonCard />
            </li>
          ))}
      </ul>
      <div ref={loaderRef} className="h-1" />
    </main>
  );
}