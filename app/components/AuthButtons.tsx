"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import React from "react";

export default function AuthButtons() {
  const { data: session, status } = useSession();

  // Compute a safe callback URL in the client (guards in case of edge hydration)
  const callbackUrl = typeof window !== "undefined" ? window.location.href : "/";

  if (status === "loading") {
    return (
      <div className="inline-flex items-center gap-3" aria-busy="true" aria-live="polite">
        <span className="h-4 w-24 animate-pulse rounded bg-gray-300" />
        <span className="h-8 w-20 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  if (session?.user) {
    const label = session.user.name || session.user.email || "Account";

    return (
      <div className="flex items-center gap-3 max-w-[220px]">
        <span
          className="truncate text-sm text-gray-700"
          title={label}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={async () => {
            await signOut({ callbackUrl: "/" });
          }}
          aria-label="Sign out"
          className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signIn(undefined, { callbackUrl })}
      aria-label="Sign in"
      className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      Sign in
    </button>
  );
}