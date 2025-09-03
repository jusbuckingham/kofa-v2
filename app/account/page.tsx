"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

interface SubscribeButtonProps {
  /** If provided, overrides session-derived status */
  isPro?: boolean;
  /** Optional loading flag if parent manages it */
  loading?: boolean;
  /** Optional status string (e.g., 'loading') for disabling */
  status?: string;
  /** Optional click handler to start checkout */
  onClick?: () => void;
}

export default function SubscribeButton({ isPro, loading = false, status, onClick }: SubscribeButtonProps) {
  const { data: session } = useSession();
  const hasActiveSub = typeof isPro === "boolean" ? isPro : Boolean(session?.user?.hasActiveSub);
  const disabled = loading || status === "loading";
  const label = disabled ? "Processing…" : "Subscribe";

  if (hasActiveSub) {
    return (
      <Link
        href="/account/subscription"
        className="px-6 py-3 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center justify-center"
      >
        Manage Subscription
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading}
      aria-disabled={disabled}
      className={`px-6 py-3 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        disabled ? "bg-gray-300 text-gray-600 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
    >
      {label}
    </button>
  );
}