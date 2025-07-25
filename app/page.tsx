"use client";

import { useState, useEffect, useRef } from "react";
import { useQuota } from "./components/ReadQuotaContext";
import ReadQuotaBanner from "./components/ReadQuotaBanner";
import SkeletonCard from "./components/SkeletonCard";
import type { NewsStory } from "./types";

const LIMIT = 5;

export default function HomePage() {
  const { hasActiveSub } = useQuota();
  const [stories, setStories] = useState<NewsStory[]>([]);
  const [offset, setOffset]       = useState(0);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Load pages
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/news/get?limit=${LIMIT}&offset=${offset}`);
        if (res.ok) {
          const data = (await res.json()) as { stories: NewsStory[]; total: number };
          if (active) {
            setStories((prev) => [...prev, ...data.stories]);
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

  return (
    <main className="max-w-3xl mx-auto p-4">
      {!hasActiveSub && <ReadQuotaBanner />}
      <h2 className="text-2xl font-bold mb-4">Today&apos;s Top Stories</h2>
      <ul className="space-y-6">
        {stories.map(story => {
          const host = new URL(story.url).hostname.replace(/^www\./, "");
          return (
            <li key={story.id} className="border-b pb-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs px-1 py-0.5 bg-gray-200 rounded">{host}</span>
                <a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xl font-semibold hover:underline"
                >
                  {story.title}
                </a>
              </div>
              <p className="mt-2 text-gray-700">{story.summary}</p>
              <p className="mt-1 text-sm text-gray-500">
                {new Date(story.publishedAt).toLocaleDateString()}
              </p>
            </li>
          );
        })}
        {loading && Array.from({ length: LIMIT }).map((_, i) => <SkeletonCard key={i} />)}
      </ul>
      <div ref={loaderRef} className="h-1" />
    </main>
  );
}