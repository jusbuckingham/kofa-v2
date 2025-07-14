"use client";
import React, { useState } from "react";
import Link from "next/link";
import type { NewsStory } from "../types";

interface StoryCardProps {
  story: NewsStory;
  isSaved?: boolean;
}

export default function StoryCard({ story, isSaved = false }: StoryCardProps) {
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

  const [showPaywall, setShowPaywall] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/user/read", { method: "POST" });
      const { remaining, subscriptionStatus } = await res.json();
      if (subscriptionStatus === "active" || remaining > 0) {
        window.open(story.url, "_blank");
        // update metadata
        const metaRes = await fetch("/api/user/metadata", { method: "POST" });
        if (metaRes.ok) {
          const json = await metaRes.json();
          window.dispatchEvent(new CustomEvent("metadataUpdate", {
            detail: { totalReads: json.totalReads }
          }));
        }
      } else {
        setShowPaywall(true);
      }
    } catch (err) {
      console.error("Error checking read quota", err);
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
          onClick={handleClick}
        >
          <h2 className="text-xl font-semibold mb-2">{story.title}</h2>
          {story.description && <p className="text-sm text-gray-600 line-clamp-3">{story.description}</p>}
        </Link>
        {showPaywall && (
          <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
            <p>You’ve reached your free stories limit for today.</p>
            <button
              onClick={() => window.location.href = "/pricing"}
              className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
            >
              Upgrade to Pro
            </button>
          </div>
        )}
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
      {story.url && (
        <button
          onClick={handleClick}
          className="mt-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Read
        </button>
      )}
      {showPaywall && (
        <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
          <p>You’ve reached your free stories limit for today.</p>
          <button
            onClick={() => window.location.href = "/pricing"}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
          >
            Upgrade to Pro
          </button>
        </div>
      )}
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