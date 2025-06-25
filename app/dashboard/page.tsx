"use client";

import { useUser } from "@kinde-oss/kinde-auth-nextjs";
import Link from "next/link";
import { isAuthEnabled } from "@/lib/auth-toggle";
import { useEffect, useState, useRef } from "react";

type NewsItem = {
  id?: string;
  title: string;
  summary: string;
  source?: string;
  timestamp: string;
};

export default function Dashboard() {
  const { user, isLoading } = useUser();

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [keyword, setKeyword] = useState("");
  const [offset, setOffset] = useState(0);
  const [sortOrder, setSortOrder] = useState("newest");
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef(null);
  const limit = 5;

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadNews = async () => {
    setLoading(true);
    try {
      // TODO: Replace with live API fetch when available
      const query = new URLSearchParams();
      if (category && category !== "all") query.append("category", category);
      if (startDate) query.append("startDate", startDate);
      if (endDate) query.append("endDate", endDate);
      if (keyword) query.append("keyword", keyword);
      query.append("offset", offset.toString());
      query.append("limit", limit.toString());
      if (sortOrder) query.append("sort", sortOrder);

      const res = await fetch(`/api/get-news?${query.toString()}`);
      const data = await res.json();
      if (offset === 0) {
        setNewsItems(data.news);
      } else {
        setNewsItems((prev) => [...prev, ...data.news]);
      }
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Failed to load news:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [offset, keyword, sortOrder]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setOffset((prev) => prev + limit);
        }
      },
      { threshold: 1.0 }
    );
    const currentRef = loaderRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [hasMore, loading]);

  if (isLoading && isAuthEnabled) {
    return <p className="p-6">Loading...</p>;
  }

  if (isAuthEnabled && !user) {
    return (
      <main className="min-h-screen bg-white text-black p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Access Restricted</h2>
          <p className="mt-4 text-gray-600">
            You must be logged in with an active plan to view this dashboard.
          </p>
          <Link href="/api/auth/login">
            <span className="mt-4 inline-block text-blue-600 hover:underline">Login</span>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="dark:bg-black dark:text-white">
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-100 text-black dark:from-black dark:to-gray-900 dark:text-white p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">📰 Kofa AI Dashboard</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Welcome{user?.given_name ? `, ${user.given_name}` : ""}! Here are your latest news summaries interpreted through a Black lens.
          </p>

          <div className="flex flex-wrap gap-4 items-center mb-6 md:mb-8">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 font-sans dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="tech">Tech</option>
              <option value="politics">Politics</option>
              <option value="justice">Justice</option>
              <option value="culture">Culture</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 font-sans dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 font-sans dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />

            <input
              type="text"
              placeholder="Search..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 font-sans dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              style={{ flexGrow: 1 }}
            />

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 font-sans dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>

            <button
              onClick={() => {
                setOffset(0);
                loadNews();
              }}
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 font-sans dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Refresh
            </button>
          </div>

          {loading && newsItems.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Loading news...</p>
          ) : (
            <div className="space-y-6">
              {newsItems.map((item) => (
                <div
                  key={item.id ?? item.timestamp}
                  className="border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 p-5 rounded-xl shadow-md hover:shadow-lg transition"
                >
                  <h2 className="text-xl font-semibold text-black dark:text-white">{item.title}</h2>
                  <p className="text-gray-700 dark:text-gray-300 mt-2">{item.summary}</p>
                  <div className="mt-3 flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>{item.source}</span>
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div ref={loaderRef} className="mt-6 text-center text-gray-500 dark:text-gray-400">
            {loading && hasMore && (
              <span className="animate-pulse">Loading more...</span>
            )}
          </div>

          <div className="mt-6">
            <Link href="/">
              <span className="text-blue-600 hover:underline dark:text-blue-400">← Back to Home</span>
            </Link>
          </div>
        </div>
        {showScrollTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 bg-black dark:bg-white text-white dark:text-black px-5 py-3 rounded-full shadow-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition duration-300"
          >
            ↑ Top
          </button>
        )}
      </main>
    </div>
  );
}