"use client";

export default function SkeletonCard() {
  return (
    <div className="border-b pb-4 animate-pulse">
      <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-300 rounded w-full mb-1"></div>
      <div className="h-4 bg-gray-300 rounded w-5/6"></div>
    </div>
  );
}