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
  const zeroLeft = remaining === 0;
  const lowQuota = !zeroLeft && remaining <= 2;

  return (
    <div className={`rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm ${className ?? ""}`}>
      <p className="mb-2">
        {zeroLeft ? (
          <>
            You’ve used all <strong>{limit}</strong> free summaries for today.{" "}
            <span className="whitespace-nowrap">Unlock unlimited reads</span> with <strong>Kofa Pro</strong>.
          </>
        ) : lowQuota ? (
          <>
            Only <strong>{remaining}</strong> free summaries left today — consider upgrading to Pro for unlimited access.
          </>
        ) : (
          <>
            You have <strong>{remaining}</strong> of <strong>{limit}</strong> free summaries left today.
          </>
        )}
      </p>

      <div className="mb-3 h-2 w-full overflow-hidden rounded bg-yellow-100" aria-hidden="true">
        <div
          className="h-full bg-yellow-400"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Daily free summary usage"
        />
      </div>

      <Link
        href="/pricing"
        aria-label={
          zeroLeft
            ? "Unlock Pro for unlimited summaries"
            : lowQuota
              ? "Upgrade to Pro to remove daily limits"
              : "Subscribe now to increase your daily limit"
        }
        className="inline-block rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {zeroLeft ? "Unlock Pro" : lowQuota ? "Upgrade to Pro" : "Subscribe Now"}
      </Link>
    </div>
  );
}