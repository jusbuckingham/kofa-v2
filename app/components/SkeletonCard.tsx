"use client";

export type SkeletonCardProps = {
  /** Preset layout sizing */
  variant?: "full" | "compact";
  /** Number of bullet rows to render */
  bullets?: number;
  /** Whether to include the image placeholder at the top */
  showImage?: boolean;
  /** Whether to include the subtle sources row at the bottom */
  showSources?: boolean;
  /** Whether to include the color-note stripe (only used for full variant) */
  showColorNote?: boolean;
  /** Toggle the pulse animation */
  animate?: boolean;
  /** Optional class for the color-note stripe */
  colorClass?: string;
  /** Additional class names for the outer wrapper */
  className?: string;
};

function Placeholder({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded bg-gray-300 dark:bg-gray-700 ${className}`}
    />
  );
}

/**
 * SkeletonCard
 * - Accessible: aria-hidden on parts + role=presentation on wrapper
 * - Reusable: accepts variant, bullets, toggles for sections
 * - Lightweight: no external deps for class merging
 */
export default function SkeletonCard({
  variant = "full",
  bullets,
  showImage = true,
  showSources = true,
  showColorNote = true,
  animate = true,
  colorClass = "bg-blue-200 dark:bg-blue-800",
  className = "",
}: SkeletonCardProps) {
  const imageHeight = variant === "full" ? "h-40" : "h-24";
  const titleWidth = variant === "full" ? "w-3/4" : "w-2/3";
  const bulletWidth = variant === "full" ? "w-5/6" : "w-4/5";

  const blocks: Array<{ key: string; className: string }> = [];

  if (showImage) {
    blocks.push({ key: "image", className: `w-full ${imageHeight}` });
  }

  blocks.push({ key: "title", className: `h-6 ${titleWidth}` });

  const bulletCount = Math.max(0, bullets ?? (variant === "compact" ? 3 : 4));
  for (let i = 0; i < bulletCount; i++) {
    blocks.push({ key: `bullet-${i}`, className: `h-4 ${bulletWidth}` });
  }

  // Only render "color-note" stripe for full variant
  if (variant === "full" && showColorNote) {
    blocks.push({ key: "color-note", className: `h-4 w-2/3 ${colorClass}` });
  }

  if (showSources) {
    // Slightly lighter to hint this is a link area
    blocks.push({
      key: "sources",
      className: "h-3 w-1/2 bg-gray-200 dark:bg-gray-600",
    });
  }

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`border-b pb-4 ${animate ? "motion-safe:animate-pulse" : ""} space-y-2 ${className}`}
    >
      {blocks.map(({ key, className: cn }) => (
        <Placeholder key={key} className={cn} />
      ))}
    </div>
  );
}