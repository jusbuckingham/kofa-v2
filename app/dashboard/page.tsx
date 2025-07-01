'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

type NewsItem = {
  title: string;
  summary: string;
  link: string;
  source: string;
  date: string;
  category: string;
};

export default function DashboardPage() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const limit = 10;
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadNews = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.append('category', category);
      if (keyword) params.append('keyword', keyword);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (sortOrder) params.append('sort', sortOrder);
      params.append('offset', offset.toString());
      params.append('limit', limit.toString());

      const res = await fetch(`/api/news/get?${params.toString()}`);
      const data = (await res.json()) as { news: NewsItem[]; hasMore: boolean };

      if (reset) {
        setNewsItems(data.news);
      } else {
        setNewsItems(prev => [...prev, ...data.news]);
      }
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  }, [category, keyword, startDate, endDate, sortOrder, offset]);

  useEffect(() => {
    setOffset(0);
    loadNews(true);
  }, [category, keyword, startDate, endDate, sortOrder, loadNews]);

  useEffect(() => {
    if (offset > 0) {
      loadNews();
    }
  }, [offset, loadNews]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setOffset(prev => prev + limit);
      }
    }, { threshold: 1.0 });

    const ref = loaderRef.current;
    if (ref) observer.observe(ref);
    return () => {
      if (ref) observer.unobserve(ref);
    };
  }, [hasMore, loading]);

  return (
    <main className="min-h-screen p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <h1 className="text-3xl font-bold mb-6">News Dashboard</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border rounded px-3 py-1 font-sans dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >
          <option value="all">All Categories</option>
          <option value="tech">Tech</option>
          <option value="politics">Politics</option>
          <option value="justice">Justice</option>
          <option value="culture">Culture</option>
        </select>

        <input
          type="text"
          placeholder="Search..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          className="border rounded px-3 py-1 font-sans dark:bg-gray-800 dark:border-gray-600 dark:text-white flex-grow"
        />

        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="border rounded px-3 py-1 font-sans dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />

        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="border rounded px-3 py-1 font-sans dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />

        <select
          value={sortOrder}
          onChange={e => setSortOrder(e.target.value)}
          className="border rounded px-3 py-1 font-sans dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>

        <button
          onClick={() => { setOffset(0); loadNews(true); }}
          className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      {/* News Items */}
      <div className="space-y-6">
        {newsItems.map(item => (
          <article key={item.link} className="p-4 bg-white dark:bg-gray-800 rounded shadow">
            <header className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(item.date).toLocaleDateString()}
              </span>
            </header>
            <p className="text-gray-700 dark:text-gray-300 mb-4">{item.summary}</p>
            <footer className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
              <span>{item.source}</span>
              <Link href={item.link} target="_blank" className="underline">
                Read full article
              </Link>
            </footer>
          </article>
        ))}
      </div>

      {/* Loading Indicator / Infinite Scroll Trigger */}
      <div ref={loaderRef} className="mt-6 text-center text-gray-500 dark:text-gray-400">
        {loading && hasMore ? 'Loading more...' : null}
      </div>
    </main>
  );
}