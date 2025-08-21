"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

interface UserWithSubscription {
  subscriptionStatus?: string; // "active" | "trialing" | "canceled" | "free" (fallback)
}

export default function Header() {
  const { data: session } = useSession();

  const subscriptionStatus =
    session?.user && "subscriptionStatus" in session.user
      ? (session.user as UserWithSubscription).subscriptionStatus ?? "free"
      : "free";

  const isPro = subscriptionStatus === "active" || subscriptionStatus === "trialing";

  const isDev = process.env.NODE_ENV !== "production";

  const adminList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);
  const isAdmin = Boolean(session?.user?.email && (
    session.user.email === "jus.buckingham@gmail.com" || adminList.includes(session.user.email)
  ));

  return (
    <header className="bg-gradient-to-r from-yellow-500 via-pink-500 to-red-500 py-3 px-4 md:px-6 mb-2">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="shrink-0" aria-label="Kofa home">
            <Image src="/images/image.png" alt="Kofa AI logo" width={32} height={32} />
          </Link>
          <div className="min-w-0">
            <Link href="/" className="text-white text-xl font-bold leading-none truncate block">
              Kofa
            </Link>
            <p className="hidden sm:block text-xs text-white/85 leading-tight truncate">
              News summaries through the lens of Black consciousness.
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-5 text-white">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/dashboard" className="hover:underline">My Summaries</Link>
          <Link href="/pricing" className="hover:underline">Pricing</Link>
          {isAdmin && (
            <Link href="/admin" className="hover:underline inline-flex items-center">
              <span>Admin</span>
              {isDev && (
                <span
                  aria-label="development"
                  title="Visible because you are in development"
                  className="ml-1 inline-flex items-center justify-center text-[10px] leading-none px-1.5 py-0.5 rounded bg-white/20 text-white"
                >
                  ✦
                </span>
              )}
            </Link>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {session?.user ? (
            <>
              {/* status pill */}
              <span
                className={`px-2 py-1 text-xs font-semibold rounded-full hidden sm:inline-block ${
                  isPro ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}
                title={isPro ? "Active subscription" : "Free tier"}
              >
                {isPro ? "Pro Member" : "Free Tier"}
              </span>

              {/* email (truncate on small) */}
              <span className="max-w-[160px] md:max-w-none truncate text-sm text-white/95" title={session.user.email ?? ""}>
                {session.user.email}
              </span>

              {/* Manage / Upgrade */}
              {isPro ? (
                <Link
                  href="/dashboard/manage-subscription"
                  className="inline-flex items-center rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/25 transition"
                >
                  Manage
                </Link>
              ) : (
                <Link
                  href="/pricing"
                  className="inline-flex items-center rounded-md bg-white text-pink-600 px-3 py-1.5 text-sm font-semibold hover:bg-pink-50 transition"
                >
                  Upgrade
                </Link>
              )}

              {/* Sign out */}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                aria-label="Sign out"
                className="inline-flex items-center rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="inline-flex items-center rounded-md bg-white text-pink-600 px-3 py-1.5 text-sm font-semibold hover:bg-pink-50 transition"
                aria-label="Sign in"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Compact mobile nav under header row */}
      <div className="md:hidden mx-auto max-w-6xl px-1 pt-2 text-white/95 flex items-center gap-4">
        <Link href="/" className="hover:underline">Home</Link>
        <Link href="/dashboard" className="hover:underline">My Summaries</Link>
        <Link href="/pricing" className="hover:underline">Pricing</Link>
        {isAdmin && (
          <Link href="/admin" className="hover:underline inline-flex items-center">
            <span>Admin</span>
            {isDev && (
              <span
                aria-label="development"
                title="Visible because you are in development"
                className="ml-1 inline-flex items-center justify-center text-[10px] leading-none px-1.5 py-0.5 rounded bg-white/30 text-white"
              >
                ✦
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  );
}