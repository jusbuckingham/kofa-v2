'use client';

import Link from 'next/link';

interface StoryCardProps {
  title: string;
  summary: string;
  url: string;
}

export default function StoryCard({ title, summary, url }: StoryCardProps) {
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white shadow-lg rounded-lg hover:shadow-2xl transition-shadow duration-200 overflow-hidden"
    >
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{summary}</p>
        <span className="text-blue-600 hover:underline text-sm">Read more →</span>
      </div>
    </Link>
  );
}