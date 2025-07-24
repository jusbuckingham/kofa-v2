"use client";

import { useState, useEffect } from "react";
import { useQuota } from "./components/ReadQuotaContext";
import ReadQuotaBanner from "./components/ReadQuotaBanner";
import type { NewsStory } from "./types";

const LIMIT = 5;

export default function HomePage() {
  const { hasActiveSub } = useQuota();
  const [stories, setStories] = useState<NewsStory[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadStories() {
      setLoading(true);
      try {
        const res = await fetch(`/api/news/get?limit=${LIMIT}&offset=${offset}`);
        if (res.ok) {
          const data = (await res.json()) as { stories: NewsStory[]; total: number };
          setStories(prev => [...prev, ...data.stories]);
          setTotal(data.total);
        } else {
          console.error("Failed to load stories", await res.text());
        }
      } catch (err) {
        console.error("Error loading stories", err);
      }
      setLoading(false);
    }
    loadStories();
  }, [offset]);

  return (
    <main className="max-w-3xl mx-auto p-4">
      {!hasActiveSub && <ReadQuotaBanner />}
      <h2 className="text-2xl font-bold mb-4">Today&apos;s Top Stories</h2>
      <ul className="space-y-6">
        {stories.map((story, idx) => (
          <li key={idx} className="border-b pb-4">
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-semibold hover:underline"
            >
              {story.title}
            </a>
            <p className="mt-2 text-gray-700">{story.summary}</p>
            <p className="mt-1 text-sm text-gray-500">
              {new Date(story.publishedAt).toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>
      {offset + LIMIT < total && (
        <div className="text-center mt-8">
          <button
            onClick={() => setOffset(offset + LIMIT)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </main>
  );
}