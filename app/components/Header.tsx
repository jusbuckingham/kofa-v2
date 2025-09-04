"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

interface UserWithSubscription {
  subscriptionStatus?: string; // "active" | "trialing" | "canceled" | "free" (fallback)
  image?: string | null;
}

interface SessionUserPro { hasActiveSub?: boolean }

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname?.startsWith(href);
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={isActive ? "page" : undefined}
      className={classNames(
        "hover:underline focus-visible:underline transition",
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
      className="inline-flex items-center rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {theme === "dark" ? (
        // Sun icon
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0 4a1 1 0 0 1-1-1v-1a1 1 0 1 1 2 0v1a1 1 0 0 1-1 1Zm0-18a1 1 0 0 1-1-1V2a1 1 0 1 1 2 0v1a1 1 0 0 1-1 1Zm10 7h-1a1 1 0 1 1 0-2h1a1 1 0 1 1 0 2ZM3 11H2a1 1 0 1 1 0-2h1a1 1 0 1 1 0 2Zm15.95 7.536-.707-.707a1 1 0 0 1 1.415-1.415l.707.707a1 1 0 1 1-1.415 1.415ZM5.05 6.464l-.707-.707A1 1 0 0 1 5.758 4.34l.707.707A1 1 0 1 1 5.05 6.464Zm12.121-1.414-.707-.707a1 1 0 1 1 1.415-1.415l.707.707a1 1 0 0 1-1.415 1.415ZM5.758 19.657l-.707.707A1 1 0 1 1 3.636 18.95l.707-.707a1 1 0 1 1 1.415 1.415Z"/>
        </svg>
      ) : (
        // Moon icon
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79Z"/>
        </svg>
      )}
    </button>
  );
}

export default function Header() {
  const { data: session } = useSession();

  const [mobileOpen, setMobileOpen] = useState(false);
  // Close on route change
  const pathname = usePathname();
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Trust backend /api/user/read for active sub status
  const [readHasActive, setReadHasActive] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/user/read', { cache: 'no-store' });
        const json = await res.json();
        if (mounted) setReadHasActive(Boolean(json?.hasActiveSub));
      } catch {
        // ignore network/JSON errors; fall back to session-only
      }
    })();
    return () => { mounted = false; };
  }, []);

  const subscriptionStatus =
    session?.user && "subscriptionStatus" in session.user
      ? (session.user as UserWithSubscription).subscriptionStatus ?? "free"
      : "free";

  const hasActiveSub = Boolean(
    session?.user && "hasActiveSub" in session.user
      ? (session.user as SessionUserPro).hasActiveSub
      : false
  );

  const avatar = (session?.user as UserWithSubscription | undefined)?.image ?? null;
  const isPro = hasActiveSub || readHasActive === true || subscriptionStatus === "active" || subscriptionStatus === "trialing";
  const isDev = process.env.NODE_ENV !== "production";

  const adminList = useMemo(() => (
    (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  ), []);
  const isAdmin = Boolean(
    session?.user?.email &&
      (session.user.email === "jus.buckingham@gmail.com" || adminList.includes(session.user.email))
  );

  const [accountOpen, setAccountOpen] = useState(false);
  const toggleAccount = () => setAccountOpen((v) => !v);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = document.getElementById("account-popover");
      const btn = document.getElementById("account-button");
      if (el && btn && !el.contains(e.target as Node) && !btn.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="bg-gradient-to-r from-yellow-500 via-pink-500 to-red-500 py-3 px-4 md:px-6 mb-2">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-black text-white px-3 py-1 rounded">
        Skip to content
      </a>
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="shrink-0" aria-label="Kofa home" prefetch={false}>
            <Image src="/images/image.png" alt="Kofa AI logo" width={32} height={32} priority />
          </Link>
          <div className="min-w-0">
            <Link href="/" className="text-white text-xl font-bold leading-none truncate block" prefetch={false}>
              Kofa
            </Link>
            <p className="hidden md:block text-xs text-white/85 leading-tight truncate">
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
            className="md:hidden inline-flex items-center rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-controls="mobile-nav"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>

          {session?.user ? (
            <>
              {/* account popover trigger */}
              <div className="relative">
                <button
                  id="account-button"
                  type="button"
                  onClick={toggleAccount}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  className="inline-flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  {avatar ? (
                    <Image src={avatar} alt={session.user.email ?? "User avatar"} width={24} height={24} className="rounded-full border border-white/30" />
                  ) : (
                    <div aria-hidden className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold">
                      {(session.user.email || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline max-w-[140px] truncate">{session.user.email}</span>
                  <svg className="h-4 w-4 opacity-80" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z" clipRule="evenodd"/></svg>
                </button>

                {/* popover */}
                <div
                  id="account-popover"
                  role="menu"
                  aria-labelledby="account-button"
                  aria-hidden={!accountOpen}
                  className={`absolute right-0 mt-2 w-56 rounded-lg border border-white/15 bg-white/95 text-gray-900 shadow-xl backdrop-blur-sm origin-top-right transform ${accountOpen ? "opacity-100 visible scale-100" : "opacity-0 invisible scale-95"} transition duration-150`}
                >
                  <div className="px-3 py-2 border-b border-black/5">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Account</p>
                    <p className="text-sm font-medium truncate">{session.user.email}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${isPro ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{isPro ? "Pro Member" : "Free Tier"}</span>
                  </div>
                  <div className="py-1" role="none">
                    {isPro ? (
                      <Link prefetch={false} href="/dashboard/manage-subscription" className="block px-3 py-2 text-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" role="menuitem">Manage subscription</Link>
                    ) : (
                      <Link prefetch={false} href="/pricing" className="block px-3 py-2 text-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" role="menuitem">Upgrade to Pro</Link>
                    )}
                    <Link prefetch={false} href="/dashboard" className="block px-3 py-2 text-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" role="menuitem">My summaries</Link>
                    <Link prefetch={false} href="/settings" className="block px-3 py-2 text-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" role="menuitem">Settings</Link>
                    {isAdmin && (
                      <Link prefetch={false} href="/admin" className="block px-3 py-2 text-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" role="menuitem">Admin</Link>
                    )}
                    <hr className="my-1 border-black/10" />
                    <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full text-left block px-3 py-2 text-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60" role="menuitem">Sign out</button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                prefetch={false}
                className="inline-flex items-center rounded-md bg-white text-pink-600 px-3 py-1.5 text-sm font-semibold hover:bg-pink-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Sign in"
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
                { isPro ? (
                  <Link
                    href="/dashboard/manage-subscription"
                    prefetch={false}
                    className="inline-flex items-center rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/25 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    Manage
                  </Link>
                ) : (
                  <Link
                    href="/pricing"
                    prefetch={false}
                    className="inline-flex items-center rounded-md bg-white text-pink-600 px-3 py-1.5 text-sm font-semibold hover:bg-pink-50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    Upgrade
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="inline-flex items-center rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/signin"
                prefetch={false}
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