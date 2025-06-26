'use client';

import { useEffect, useState } from 'react';

interface NewsItem {
  title: string;
  summary: string;
  link: string;
}

export default function NewsTicker() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('/api/get-news?limit=20');
        const json = await res.json();
        setNews(json.news || json);
      } catch (err) {
        console.error('Failed to load ticker news:', err);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative bg-black text-yellow-400 overflow-hidden py-2">
      {/* Left and right fade overlays */}
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black to-transparent pointer-events-none" />

      {/* Scrolling container */}
      <div className="flex whitespace-nowrap animate-marquee gap-12 px-8 hover:[animation-play-state:paused]">
        {news.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            title={item.summary}
            className="inline-block max-w-xs hover:underline"
          >
            <strong>{item.title}</strong>: {item.summary}
          </a>
        ))}
      </div>
    </div>
  );
}