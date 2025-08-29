"use client";

import React from "react";
import { useQuota } from "./ReadQuotaContext";

interface ReadCounterProps {
  className?: string;
  /** Label for what is being counted (e.g., "summaries" or "articles"). Defaults to "summaries". */
  label?: string;
  /** Optional loading message while quota is being fetched. Defaults to "Loading…". */
  loadingMessage?: string;
}

export function ReadCounter({
  className,
  label = "summaries",
  loadingMessage = "Loading…",
}: ReadCounterProps) {
  const { remaining, limit, hasActiveSub } = useQuota();

  // Subtle accessible loading state
  if (remaining === null) {
    return (
      <p
        className={className ?? "text-sm text-gray-600"}
        aria-live="polite"
        role="status"
      >
        {loadingMessage}
      </p>
    );
  }

  // For subscribers, show unlimited
  if (hasActiveSub) {
    return (
      <p className={className ?? "text-sm text-gray-700"} aria-live="polite">
        <span role="img" aria-label="check">✅</span>{" "}
        Unlimited {label} (Subscriber)
      </p>
    );
  }

  // For non-subscribers, show remaining count
  return (
    <p className={className ?? "text-sm text-gray-700"} aria-live="polite">
      <strong>{remaining}</strong> of <strong>{limit}</strong> free {label} left today
    </p>
  );
}

export default ReadCounter;