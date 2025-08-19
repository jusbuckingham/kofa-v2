"use client";

import React from "react";
import Link from "next/link";
import { useQuota } from "./ReadQuotaContext";

interface BannerProps {
  className?: string;
}

export default function ReadQuotaBanner({ className }: BannerProps) {
  const quota = useQuota();
  const { remaining, limit } = quota;
  // Some code paths of ReadQuotaContext may not supply a subscription flag.
  // Derive it defensively so TypeScript is happy even if the key is missing.
  const hasActiveSub = (quota as { hasActiveSub?: boolean }).hasActiveSub ?? false;

  // If user is Pro (or quota not yet loaded), don't show the banner
  if (hasActiveSub || remaining == null || limit == null) return null;

  const used = Math.max(0, limit - remaining);
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className={`rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm ${className ?? ""}`}>
      <p className="mb-2">
        You have <strong>{remaining}</strong> of <strong>{limit}</strong> free summaries left today.
      </p>
      <div className="mb-3 h-2 w-full overflow-hidden rounded bg-yellow-100">
        <div className="h-full bg-yellow-400" style={{ width: `${percent}%` }} />
      </div>
      <Link
        href="/pricing"
        className="inline-block rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
      >
        Subscribe Now
      </Link>
    </div>
  );
}