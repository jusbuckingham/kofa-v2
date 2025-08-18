"use client";

export default function SkeletonCard() {
  return (
    <div className="border-b pb-4 animate-pulse space-y-2">
      {/* Image placeholder */}
      <div className="w-full h-40 bg-gray-300 rounded"></div>

      {/* One-liner placeholder */}
      <div className="h-6 bg-gray-300 rounded w-3/4"></div>

      {/* Bullet placeholders (5 total) */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-4 bg-gray-300 rounded w-5/6"></div>
      ))}

      {/* ColorNote placeholder */}
      <div className="h-4 bg-gray-300 rounded w-2/3"></div>

      {/* Sources placeholder */}
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}