"use client";
import React, { useState, useEffect } from "react";
import type { NewsStory } from "../types";
import StoryCard from "./StoryCard";

interface NewsListProps {
  initialStories?: NewsStory[];
}

export default function NewsList({ initialStories = [] }: NewsListProps) {
  const [stories, setStories] = useState<NewsStory[]>(initialStories);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<(string | number)[]>([]);

  useEffect(() => {
    fetch("/api/favorites")
      .then(res => res.json())
      .then(json => {
        const ids = (json.data as { story: NewsStory }[]).map(f => f.story.id);
        setSavedIds(ids);
      })
      .catch(() => {});
  }, []);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/news?page=${page + 1}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      // Expect shape: { data: NewsStory[], totalPages: number }
      const json = await res.json() as { data: NewsStory[]; totalPages: number };
      const data = Array.isArray(json.data) ? json.data : [];

      // On first fetch, grab totalPages
      if (totalPages === null) {
        setTotalPages(json.totalPages);
      }

      if (data.length === 0) {
        // No stories => end
        setHasMore(false);
      } else {
        setStories(prev => [...prev, ...data]);
        const nextPage = page + 1;
        // If nextPage is last or beyond, stop
        if (json.totalPages <= nextPage) {
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

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stories.map((story, idx) => (
          <div key={story.id ?? idx} className="fade-in">
            <StoryCard story={story} isSaved={savedIds.includes(story.id)} />
          </div>
        ))}
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
          <p className="text-gray-500">No more stories</p>
        )}
      </div>

      <style jsx>{`
        .fade-in {
          animation: fadein 0.5s ease-in-out;
        }
        @keyframes fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}