'use client';

import Link from 'next/link';
import type { NewsStory } from "../types";

interface StoryCardProps {
  story: NewsStory;
}

export default function StoryCard({ story }: StoryCardProps) {
  // Render a real link (new tab) if we have a URL
  if (story.url) {
    return (
      <Link
        href={story.url}
        className="block w-full max-w-md p-6 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-colors hover:border-gray-300"
        target="_blank"
        rel="noopener noreferrer"
      >
        <h2 className="text-xl font-semibold mb-2">{story.title}</h2>
        {story.description && <p className="text-sm text-gray-600 line-clamp-3">{story.description}</p>}
      </Link>
    );
  }

  // Otherwise render a static card
  return (
    <div className="block w-full max-w-md p-6 border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-2">{story.title}</h2>
      {story.description && <p className="text-sm text-gray-600 line-clamp-3">{story.description}</p>}
    </div>
  );
}