'use client';

import Link from 'next/link';

interface StoryCardProps {
  title: string;
  summary: string;
  url?: string;
}

export default function StoryCard({ title, summary, url }: StoryCardProps) {
  const cardClasses = "block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden";

  const cardContent = (
    <div>
      <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">{summary}</p>
      {url && (
        <span className="text-blue-500 hover:underline text-sm">Read more →</span>
      )}
    </div>
  );

  if (url) {
    return (
      <Link href={url} target="_blank" rel="noopener noreferrer" className={cardClasses}>
        {cardContent}
      </Link>
    );
  }

  return <div className={cardClasses}>{cardContent}</div>;
}