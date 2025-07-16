"use client";
import React, { useState } from "react";
import type { NewsStory } from "../types";
import StoryCard from "./StoryCard";

interface NewsTickerProps {
  initialStories?: NewsStory[];
}

export default function NewsTicker({ initialStories = [] }: NewsTickerProps) {
  const [stories, setStories] = useState<NewsStory[]>(initialStories);
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
      const data: NewsStory[] = await res.json();
      if (data.length === 0) {
        setHasMore(false);
        return;
      }
      setStories(prev => [...prev, ...data]);
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
        {stories.map((s, i) => {
          const key = s.id != null ? s.id : `story-${i}`;
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
          <p className="mt-6 text-center text-gray-500">No more stories</p>
        )}
      </div>
    </>
  );
}