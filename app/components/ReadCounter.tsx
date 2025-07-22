

"use client";

import React from "react";
import { useReadQuota } from "./ReadQuotaContext";

type ReadCounterProps = {
  className?: string;
};

/**
 * Tiny badge / counter that shows how many free reads remain.
 * Returns null while quota is loading.
 */
export function ReadCounter({ className }: ReadCounterProps) {
  const { remaining, limit, paywalled } = useReadQuota();

  if (remaining === null) return null;

  const text = paywalled
    ? "Limit reached"
    : `${remaining}/${limit} free reads left`;

  return (
    <span
      className={`inline-block rounded bg-gray-800 px-2 py-0.5 text-xs text-white ${className ?? ""}`}
    >
      {text}
    </span>
  );
}

export default ReadCounter;