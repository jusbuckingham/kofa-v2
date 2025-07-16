"use client";
import React, { useState } from "react";
import Link from "next/link";
import type { NewsStory } from "../types";

interface StoryCardProps {
  story: NewsStory;
  isSaved?: boolean;
}

export default function StoryCard({
  story,
  isSaved = false,
}: StoryCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const saveStory = async () => {
    if (isSaved || isSaving) return;
    setIsSaving(true);
    try {
      await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story }),
      });
    } catch (err) {
      console.error("Failed to save story:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/user/read", { method: "POST" });
      const { remaining, subscriptionStatus } = await res.json();
      if (subscriptionStatus === "active" || remaining > 0) {
        window.open(story.url, "_blank");
        const metaRes = await fetch("/api/user/metadata", { method: "POST" });
        if (metaRes.ok) {
          const json = await metaRes.json();
          window.dispatchEvent(
            new CustomEvent("metadataUpdated", {
              detail: {
                totalReads: json.totalReads,
                lastLogin: json.lastLogin,
              },
            })
          );
        }
      } else {
        setShowPaywall(true);
      }
    } catch (err) {
      console.error("Error checking read quota", err);
    }
  };

  return (
    <div className="block w-full max-w-md p-6 border rounded-lg shadow-sm transition-opacity duration-500 ease-in fade-in">
      {story.url ? (
        <Link
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
          onClick={handleClick}
        >
          <h2 className="text-xl font-semibold mb-2">{story.title}</h2>
          {story.description && (
            <p className="text-sm text-gray-600 line-clamp-3">
              {story.description}
            </p>
          )}
        </Link>
      ) : (
        <>
          <h2 className="text-xl font-semibold mb-2">{story.title}</h2>
          {story.description && (
            <p className="text-sm text-gray-600 line-clamp-3">
              {story.description}
            </p>
          )}
        </>
      )}

      {showPaywall && (
        <div className="mt-4 p-4 bg-yellow-100 text-yellow-800 rounded">
          <p>You’ve reached your free stories limit for today.</p>
          <button
            onClick={() => (window.location.href = "/pricing")}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
          >
            Upgrade to Pro
          </button>
        </div>
      )}

      {story.url && !showPaywall && (
        <button
          onClick={handleClick}
          className="mt-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center"
        >
          Read
        </button>
      )}

      <button
        onClick={saveStory}
        disabled={isSaved || isSaving}
        className={`mt-4 px-3 py-1 rounded flex items-center justify-center ${
          isSaved
            ? "bg-gray-400 text-white cursor-default"
            : "bg-green-500 text-white hover:bg-green-600"
        }`}
      >
        {isSaving && (
          <svg
            className="animate-spin h-4 w-4 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
            />
          </svg>
        )}
        {isSaved ? "Saved" : isSaving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}