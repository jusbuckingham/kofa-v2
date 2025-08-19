"use client";

function Placeholder({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded bg-gray-300 dark:bg-gray-700 ${className}`}></div>;
}

export default function SkeletonCard() {
  return (
    <div aria-hidden="true" className="border-b pb-4 animate-pulse space-y-2">
      {/* Image placeholder */}
      <Placeholder className="w-full h-40" />

      {/* One-liner placeholder */}
      <Placeholder className="h-6 w-3/4" />

      {/* Bullet placeholders (5 total) */}
      {[...Array(5)].map((_, i) => (
        <Placeholder key={i} className="h-4 w-5/6" />
      ))}

      {/* ColorNote placeholder */}
      <Placeholder className="h-4 w-2/3" />

      {/* Sources placeholder */}
      <Placeholder className="h-3 w-1/2 bg-gray-200 dark:bg-gray-600" />
    </div>
  );
}