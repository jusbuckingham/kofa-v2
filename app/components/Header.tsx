"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

interface UserWithSubscription {
  subscriptionStatus?: string; // "active" | "trialing" | "canceled" | "free" (fallback)
  image?: string | null;
}

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      prefetch
      aria-current={isActive ? "page" : undefined}
      className={classNames(
        "hover:underline transition", 
        isActive && "underline underline-offset-4 decoration-white/80"
      )}
    >
      {children}
    </Link>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Initialize from localStorage or prefers-color-scheme
  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
      if (stored === "dark" || stored === "light") {
        setTheme(stored);
        document.documentElement.classList.toggle("dark", stored === "dark");
      } else {
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        const initial = prefersDark ? "dark" : "light";
        setTheme(initial);
        document.documentElement.classList.toggle("dark", initial === "dark");
      }
    } catch {}
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try { localStorage.setItem("theme", next); } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex items-center rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition"
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

export default function Header() {
  const { data: session } = useSession();

  const [mobileOpen, setMobileOpen] = useState(false);
  // Close on route change
  const pathname = usePathname();
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const subscriptionStatus =
    session?.user && "subscriptionStatus" in session.user
      ? (session.user as UserWithSubscription).subscriptionStatus ?? "free"
      : "free";

  const avatar = (session?.user as UserWithSubscription | undefined)?.image ?? null;
  const isPro = subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const isDev = process.env.NODE_ENV !== "production";

  const adminList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isAdmin = Boolean(
    session?.user?.email &&
      (session.user.email === "jus.buckingham@gmail.com" || adminList.includes(session.user.email))
  );

  return (
    <header className="bg-gradient-to-r from-yellow-500 via-pink-500 to-red-500 py-3 px-4 md:px-6 mb-2">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-black text-white px-3 py-1 rounded">
        Skip to content
      </a>
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="shrink-0" aria-label="Kofa home" prefetch>
            <Image src="/images/image.png" alt="Kofa AI logo" width={32} height={32} priority />
          </Link>
          <div className="min-w-0">
            <Link href="/" className="text-white text-xl font-bold leading-none truncate block" prefetch>
              Kofa
            </Link>
            <p className="hidden sm:block text-xs text-white/85 leading-tight truncate">
              News summaries through the lens of Black consciousness.
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-5 text-white">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/dashboard">My Summaries</NavLink>
          <NavLink href="/pricing">Pricing</NavLink>
          {isAdmin && (
            <NavLink href="/admin">
              <span className="inline-flex items-center">Admin</span>
              {isDev && (
                <span
                  aria-label="development"
                  title="Visible because you are in development"
                  className="ml-1 inline-flex items-center justify-center text-[10px] leading-none px-1.5 py-0.5 rounded bg-white/20 text-white"
                >
                  ✦
                </span>
              )}
            </NavLink>
          )}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* Mobile menu toggle (hidden on md and up) */}
          <button
            type="button"
            className="md:hidden inline-flex items-center rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition"
            aria-controls="mobile-nav"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>

          {session?.user ? (
            <>
              {/* status pill */}
              <span
                className={classNames(
                  "px-2 py-1 text-xs font-semibold rounded-full hidden sm:inline-block",
                  isPro ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                )}
                title={isPro ? "Active subscription" : "Free tier"}
              >
                {isPro ? "Pro Member" : "Free Tier"}
              </span>

              {/* avatar + email */}
              <div className="flex items-center gap-2 min-w-0">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={session.user.email ?? "User avatar"}
                    width={28}
                    height={28}
                    className="rounded-full border border-white/30"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold"
                    title={session.user.email ?? "User"}
                  >
                    {(session.user.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="max-w-[160px] md:max-w-none truncate text-sm text-white/95" title={session.user.email ?? ""}>
                  {session.user.email}
                </span>
              </div>

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
                prefetch
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile collapsible nav */}
      <div
        id="mobile-nav"
        className={classNames(
          "md:hidden mx-auto max-w-6xl px-2 pt-2 pb-3 space-y-2 transition-[max-height,opacity] overflow-hidden",
          mobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="flex flex-col gap-2 text-white">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/dashboard">My Summaries</NavLink>
          <NavLink href="/pricing">Pricing</NavLink>
          {isAdmin && <NavLink href="/admin">Admin</NavLink>}
          <div className="pt-2 flex items-center gap-2">
            {session?.user ? (
              <>
                { (subscriptionStatus === "active" || subscriptionStatus === "trialing") ? (
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
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex items-center rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/signin"
                className="inline-flex items-center rounded-md bg-white text-pink-600 px-3 py-1.5 text-sm font-semibold hover:bg-pink-50 transition"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}