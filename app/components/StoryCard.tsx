"use client";
import React from "react";
import Link from "next/link";
import type { NewsStory } from "../types";

interface StoryCardProps {
  story: NewsStory;
  isSaved?: boolean;
}

export default function StoryCard({ story, isSaved = false }: StoryCardProps) {
  // Increment read count and notify dashboard
  const incrementRead = async () => {
    try {
      const res = await fetch("/api/user/metadata", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        // emit a global event so DashboardPage can update
        window.dispatchEvent(new CustomEvent("metadataUpdate", {
          detail: { totalReads: json.totalReads }
        }));
      }
    } catch (e) {
      console.error("Failed to increment read count", e);
    }
  };

  const saveStory = async () => {
    if (isSaved) return;
    try {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story }),
      });
    } catch (err) {
      console.error("Failed to save story:", err);
    }
  };

  if (story.url) {
    return (
      <div className="block w-full max-w-md p-6 border rounded-lg shadow-sm">
        <Link
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          onClick={incrementRead}
        >
          <h2 className="text-xl font-semibold mb-2">{story.title}</h2>
          {story.description && <p className="text-sm text-gray-600 line-clamp-3">{story.description}</p>}
        </Link>
        <button
          onClick={saveStory}
          disabled={isSaved}
          className={`mt-4 px-3 py-1 rounded ${
            isSaved
              ? "bg-gray-400 text-white cursor-default"
              : "bg-green-500 text-white hover:bg-green-600"
          }`}
        >
          {isSaved ? "Saved" : "Save"}
        </button>
      </div>
    );
  }

  return (
    <div className="block w-full max-w-md p-6 border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-2">{story.title}</h2>
      {story.description && <p className="text-sm text-gray-600 line-clamp-3">{story.description}</p>}
      <button
        onClick={saveStory}
        disabled={isSaved}
        className={`mt-4 px-3 py-1 rounded ${
          isSaved
            ? "bg-gray-400 text-white cursor-default"
            : "bg-green-500 text-white hover:bg-green-600"
        }`}
      >
        {isSaved ? "Saved" : "Save"}
      </button>
    </div>
  );
}