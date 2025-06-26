

"use client";

import React from "react";

interface ErrorBoundaryProps {
  error: Error;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorBoundaryProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-2">Something went wrong!</h1>
      <p className="mb-4">{error.message}</p>
      <button
        onClick={() => reset()}
        className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded transition"
      >
        Try again
      </button>
    </div>
  );
}