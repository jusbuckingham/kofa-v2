"use client";

function Placeholder({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded bg-gray-300 dark:bg-gray-700 ${className}`}
    />
  );
}

// Declarative layout config (stable keys, no arrays created in render)
const BULLET_COUNT = 4;
const SKELETON_BLOCKS: Array<{ key: string; className: string }> = [
  { key: "image", className: "w-full h-40" },
  { key: "title", className: "h-6 w-3/4" },
  ...Array.from({ length: BULLET_COUNT }, (_, i) => ({
    key: `bullet-${i}`,
    className: "h-4 w-5/6",
  })),
  { key: "color-note", className: "h-4 w-2/3" },
  // Slightly lighter to hint this is a link area; keep intentional color difference
  { key: "sources", className: "h-3 w-1/2 bg-gray-200 dark:bg-gray-600" },
];

export default function SkeletonCard() {
  return (
    <div aria-hidden="true" className="border-b pb-4 animate-pulse space-y-2">
      {SKELETON_BLOCKS.map(({ key, className }) => (
        <Placeholder key={key} className={className} />
      ))}
    </div>
  );
}