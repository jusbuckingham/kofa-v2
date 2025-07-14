"use client";

import React, { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import type { NewsStory } from "../types";
import StoryCard from "../components/StoryCard";

interface Favorite {
  story: NewsStory;
  savedAt: string;
}

export default function DashboardPage() {
  // Remove required: true to prevent redirect loop
  const { data: session, status } = useSession();
  if (status === "loading") return <p>Loading...</p>;
  if (!session) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p>Please sign in to view your dashboard.</p>
        <button
          onClick={() => signIn()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sign in
        </button>
      </div>
    );
  }

  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [lastLogin, setLastLogin] = useState<string>("");
  const [totalReads, setTotalReads] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [clearLoading, setClearLoading] = useState<boolean>(false);

  // Helper for relative time
  const timeSince = (dateString: string) => {
    const now = Date.now();
    const then = new Date(dateString).getTime();
    const seconds = Math.floor((now - then) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
  };

  // Fetch data
  useEffect(() => {
    if (!session) return;
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
  }, [session]);

  const removeStory = async (storyId: string | number) => {
    try {
      const res = await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId }),
      });
      if (!res.ok) throw new Error("Failed to remove story");
      setFavorites((prev) => prev.filter((f) => f.story.id !== storyId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
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

        {favorites.length > 0 && (
          <button
            onClick={async () => {
              setClearLoading(true);
              await fetch("/api/favorites", { method: "DELETE" });
              setFavorites([]);
              setClearLoading(false);
            }}
            className="mb-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            <>
              {clearLoading && (
                <svg className="w-5 h-5 animate-spin mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l2-2-2-2v4a8 8 0 00-8 8h4l-2 2 2 2H4z"></path>
                </svg>
              )}
              {clearLoading ? "Clearing..." : "Clear all"}
            </>
          </button>
        )}

        <h2 className="text-xl font-semibold mb-4">Saved Stories</h2>

        {favorites.length === 0 ? (
          <p>No saved stories yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {favorites.map((fav, idx) => (
              <div
                key={fav.story.id ?? idx}
                className="relative group"
                style={{ animation: 'fadeIn 0.5s ease-out', animationFillMode: 'forwards' }}
              >
                <StoryCard story={fav.story} />
                <p className="text-sm text-gray-500 mt-2">
                  Saved {timeSince(fav.savedAt)}
                </p>
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
    </>
  );
}