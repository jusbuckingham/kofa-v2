"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuota } from "./ReadQuotaContext";

/**
 * PaywallBanner
 * Shows a sticky banner at the top when the user has exhausted the daily free quota
 * and does not have an active subscription. Includes a dismiss button for the session.
 */
export default function PaywallBanner() {
  const { remaining, limit, hasActiveSub } = useQuota();
  const [dismissed, setDismissed] = useState(false);

  // Show only when not subscribed, out of reads, and not dismissed
  const show =
    !hasActiveSub && typeof remaining === "number" && remaining <= 0 && !dismissed;

  if (!show) return null;

  return (
    <section
      role="alert"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white"
    >
      <div className="mx-auto max-w-5xl px-4 py-2 flex items-center gap-3">
        <p className="text-sm md:text-base flex-1">
          You’ve reached your free limit of {limit ?? 0} summaries today. Unlock
          unlimited access with a subscription.
        </p>

        <Link
          href="/pricing"
          className="rounded bg-white/20 px-3 py-1 text-white hover:bg-white/30 transition"
        >
          Subscribe Now
        </Link>

        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="p-1 rounded-full hover:bg-white/20 transition focus:outline-none"
        >
          <span aria-hidden className="text-lg leading-none font-bold">
            &times;
          </span>
        </button>
      </div>
    </section>
  );
}