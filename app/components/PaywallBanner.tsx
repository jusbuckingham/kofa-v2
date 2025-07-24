"use client";

import React from "react";
import Link from "next/link";
import { useQuota } from "./ReadQuotaContext";

export default function PaywallBanner() {
  const { remaining, limit, hasActiveSub } = useQuota();

  const show = !hasActiveSub && typeof remaining === "number" && remaining <= 0;

  if (!show) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-red-600 text-white text-sm md:text-base">
      <div className="mx-auto max-w-5xl px-4 py-2 flex items-center justify-between">
        <span>
          You’ve hit your free {limit ?? ""} story limit for today. Subscribe to keep reading.
        </span>
        <Link
          href="/pricing"
          className="ml-4 rounded bg-white/20 px-3 py-1 text-white hover:bg-white/30 transition"
        >
          View Plans
        </Link>
      </div>
    </div>
  );
}