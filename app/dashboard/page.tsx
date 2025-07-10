'use client';

import { useEffect, useState, useCallback } from 'react';
import StoryCard from '../components/StoryCard';

type NewsItem = {
  title: string;
  summary: string;
  url: string;
  source: string;
  date: string;
  category: string;
};

export default function DashboardPage() {
  const LIMIT = 10;

  const [items, setItems] = useState<NewsItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadNews = useCallback(async (reset = false) => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(LIMIT),
      offset: String(reset ? 0 : offset),
    });
    try {
      const res = await fetch(
        `/api/news/get?${params.toString()}`,
        { cache: 'no-store' }
      );
      if (!res.ok) {
        console.error('Fetch error:', res.statusText, await res.text());
        return;
      }
      const { data, hasMore } = await res.json();
      if (reset) {
        setItems(data);
        setOffset(LIMIT);
      } else {
        setItems(prev => [...prev, ...data]);
        setOffset(prev => prev + LIMIT);
      }
      setHasMore(hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="space-y-6">
        {items.map((item) => (
          <StoryCard
            key={item.url}
            title={item.title}
            summary={item.summary}
            url={item.url}
          />
        ))}
      </div>
      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={() => loadNews()}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}