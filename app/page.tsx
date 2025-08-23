import React from "react";
import type { Metadata } from "next";
import NewsList from "./components/NewsList";

export const metadata: Metadata = {
  title: "Kofa — Home",
  description: "Fresh, concise summaries with a Black perspective.",
};

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Show 7 at a time so the footer is reachable; newest first */}
      <NewsList />
    </main>
  );
}