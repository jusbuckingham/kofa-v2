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
  const [showPaywall] = useState(false);
  const [isReading, setIsReading] = useState(false);

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

  const handleClick = async () => {
    if (isReading) return;
    setIsReading(true);
    try {
      // 1) check current dailyCount
      const quotaRes = await fetch("/api/user/metadata");
      if (!quotaRes.ok) throw new Error("Unable to check read limit");
      const { dailyCount } = (await quotaRes.json()) as { dailyCount: number };
      if (dailyCount >= 3) {
        // over the free limit -> go to pricing
        window.location.href = "/pricing";
        return;
      }

      // 2) record this read
      const recRes = await fetch("/api/user/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.id }),
      });
      if (recRes.ok) {
        const meta = (await recRes.json()) as {
          totalReads: number;
          lastLogin: string;
          dailyCount: number;
        };
        window.dispatchEvent(
          new CustomEvent("metadataUpdated", { detail: meta })
        );
      } else {
        console.error("Failed to record read");
      }

      // 3) open story
      window.open(story.url, "_blank");
    } catch (err) {
      console.error("Error checking read quota", err);
    } finally {
      setIsReading(false);
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
          disabled={isReading}
          className={`mt-4 px-3 py-1 rounded flex items-center justify-center ${
            isReading
              ? "bg-blue-300 text-white cursor-default"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {isReading && (
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