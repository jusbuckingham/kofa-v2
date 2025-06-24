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
      const res = await fetch('/api/get-news');
      const data = await res.json();
      setNews(data);
    };

    fetchNews();
  }, []);

  return (
    <div className="w-full bg-black text-yellow-400 border-t border-yellow-600 overflow-hidden whitespace-nowrap py-2 px-4 text-sm">
      <div className="inline-block animate-marquee">
        {news.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mr-12 hover:underline"
          >
            <strong>{item.title}</strong>: {item.summary}
          </a>
        ))}
      </div>
    </div>
  );
}