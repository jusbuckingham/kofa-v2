"use client";

import React, { useState, useEffect, useCallback } from "react";
import StoryCard from "../components/StoryCard";
import type { NewsStory } from "../types";

export default function DashboardPage() {
  const [savedStories, setSavedStories] = useState<NewsStory[]>([]);
  const [lastLogin, setLastLogin] = useState<string>("");
  const [totalReads, setTotalReads] = useState<number>(0);

  // Fetch favorites and metadata on mount
  const fetchData = useCallback(async () => {
    try {
      const [favRes, metaRes] = await Promise.all([
        fetch("/api/favorites", { cache: "no-store" }),
        fetch("/api/user/metadata", { cache: "no-store" }),
      ]);
      if (favRes.ok) {
        const favJson = await favRes.json() as { data: { story: NewsStory }[] };
        setSavedStories(favJson.data.map((f) => f.story));
      }
      if (metaRes.ok) {
        const metaJson = await metaRes.json() as {
          lastLogin: string;
          totalReads: number;
          dailyCount: number;
          subscriptionStatus: boolean;
        };
        setLastLogin(metaJson.lastLogin);
        setTotalReads(metaJson.totalReads);
      }
    } catch (err) {
      console.error("Error loading dashboard data", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const handler = (e: CustomEvent) => {
      setLastLogin(e.detail.lastLogin);
      setTotalReads(e.detail.totalReads);
    };
    window.addEventListener("metadataUpdated", handler as EventListener);
    return () => {
      window.removeEventListener("metadataUpdated", handler as EventListener);
    };
  }, [fetchData]);

  const handleRemove = async (storyId: string | number) => {
    try {
      const res = await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId }),
      });
      if (res.ok) {
        setSavedStories((prev) => prev.filter((s) => s.id !== storyId));
      } else {
        console.error("Failed to remove favorite");
      }
    } catch (err) {
      console.error("Error removing favorite", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Your Saved Stories</h1>
      <div className="mb-6">
        <p>
          <strong>Last login:</strong>{" "}
          {lastLogin ? new Date(lastLogin).toLocaleString() : "—"}
        </p>
        <p>
          <strong>Total stories read:</strong> {totalReads}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {savedStories.map((story) => (
          <div key={story.id} className="relative">
            <StoryCard story={story} />
            <button
              onClick={() => handleRemove(story.id)}
              className="absolute top-2 right-2 text-sm text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
        {savedStories.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No saved stories.
          </p>
        )}
      </div>
    </div>
  );
}