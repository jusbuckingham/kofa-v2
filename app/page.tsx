// app/page.tsx
"use client";

import React from "react";
import { useQuota } from "@/components/ReadQuotaContext";
import ReadQuotaBanner from "@/components/ReadQuotaBanner";
import NewsList from "@/components/NewsList";

export default function HomePage() {
  let hasActiveSub = false;
  try {
    const quota = useQuota();
    hasActiveSub = quota?.hasActiveSub ?? false;
  } catch {
    hasActiveSub = false;
  }

  return (
    <main
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
      suppressHydrationWarning
    >
      {!hasActiveSub && <ReadQuotaBanner />}

      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Today&apos;s Top Summaries
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Fresh, concise breakdowns. First 7 are free—upgrade any time for full access.
        </p>
      </header>

      {/* Show 7 at a time so the footer is reachable; newest first. */}
      <NewsList />
    </main>
  );
}