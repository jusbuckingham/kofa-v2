"use client";

import React from "react";
import { useQuota } from "./ReadQuotaContext";

interface ReadCounterProps {
  className?: string;
}

export function ReadCounter({ className }: ReadCounterProps) {
  const { remaining, limit, hasActiveSub } = useQuota();

  // If quota hasn’t loaded yet, render nothing
  if (remaining === null) {
    return null;
  }

  // For subscribers, show unlimited summaries
  if (hasActiveSub) {
    return <div className={className}>Unlimited summaries</div>;
  }

  // For non-subscribers, show the remaining count
  return (
    <div className={className}>
      {remaining} of {limit} summaries left today
    </div>
  );
}