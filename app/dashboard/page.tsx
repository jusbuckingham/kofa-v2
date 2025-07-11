"use client";

import React, { useState, useEffect } from "react";
import type { NewsStory } from "../types";
import StoryCard from "../components/StoryCard";

interface Favorite {
  story: NewsStory;
  savedAt: string;
}

export default function DashboardPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [lastLogin, setLastLogin] = useState<string>("");
  const [totalReads, setTotalReads] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch favorites and metadata when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [favRes, metaRes] = await Promise.all([
          fetch("/api/favorites"),
          fetch("/api/user/metadata"),
        ]);
        if (!favRes.ok) throw new Error("Failed to load saved stories");
        if (!metaRes.ok) throw new Error("Failed to load user metadata");

        const favJson = await favRes.json();
        setFavorites(favJson.data);

        const metaJson = await metaRes.json();
        setLastLogin(metaJson.lastLogin);
        setTotalReads(metaJson.totalReads);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Remove a saved story
  const removeStory = async (storyId: string | number) => {
    try {
      const res = await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId }),
      });
      if (!res.ok) throw new Error("Failed to remove story");
      // Optimistically update UI
      setFavorites(prev => prev.filter(f => f.story.id !== storyId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="mb-6">
        <p>
          <strong>Last login:</strong> {new Date(lastLogin).toLocaleString()}
        </p>
        <p>
          <strong>Total stories read:</strong> {totalReads}
        </p>
      </div>
      <h2 className="text-xl font-semibold mb-4">Saved Stories</h2>
      {favorites.length === 0 ? (
        <p>No saved stories yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {favorites.map((fav, idx) => (
            <div key={fav.story.id ?? idx} className="relative group">
              <StoryCard story={fav.story} />
              <button
                onClick={() => removeStory(fav.story.id)}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}