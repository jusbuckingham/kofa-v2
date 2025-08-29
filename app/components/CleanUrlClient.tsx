

"use client";

import { useEffect } from "react";

type CleanUrlClientProps = {
  /** Params to always preserve (in addition to defaults). */
  preserveParams?: string[];
  /** Extra params to always remove (in addition to defaults). Accepts exact names or globs like 'utm_*'. */
  removeParams?: string[];
  /** If true, strips hash fragments too. Default: false */
  removeHash?: boolean;
  /** Milliseconds to wait before cleaning (lets other code read params). Default: 0 */
  delayMs?: number;
};

const DEFAULT_PRESERVE = new Set<string>([
  "code",              // OAuth
  "state",             // OAuth/CSRF
  "session_id",        // Stripe checkout
  "redirect_status",   // Stripe success/cancel
  "token",             // generic one-time tokens
  "invite"             // your own
]);

const DEFAULT_REMOVE_GLOBS: string[] = [
  "utm_*",
  "gclid",
  "fbclid",
  "msclkid",
  "vercelToolbar",
  "ref"
];

function matchesGlob(name: string, glob: string) {
  if (!glob.includes("*")) return name === glob;
  const re = new RegExp(
    "^" + glob.split("*").map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$",
    "i"
  );
  return re.test(name);
}

export default function CleanUrlClient({
  preserveParams = [],
  removeParams = [],
  removeHash = false,
  delayMs = 0
}: CleanUrlClientProps): null {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const timer = setTimeout(() => {
      const current = new URL(window.location.href);

      // Build sets/lists
      const preserve = new Set<string>([
        ...DEFAULT_PRESERVE,
        ...preserveParams.map(p => p.toLowerCase()),
      ]);

      const removeGlobs = [...DEFAULT_REMOVE_GLOBS, ...removeParams];

      // Decide which params to keep
      const kept = new URLSearchParams();
      for (const [key, value] of current.searchParams.entries()) {
        const k = key.toLowerCase();

        // Keep if explicitly preserved
        if (preserve.has(k)) {
          kept.append(key, value);
          continue;
        }

        // Remove if it matches any remove glob
        const isJunk = removeGlobs.some(g => matchesGlob(k, g.toLowerCase()));
        if (!isJunk) {
          // Unknown param—default behavior: keep it
          kept.append(key, value);
        }
      }

      // If cleaning changes the URL, replace it
      const newSearch = kept.toString();
      const newHash = removeHash ? "" : window.location.hash;
      const nextUrl = current.pathname + (newSearch ? `?${newSearch}` : "") + newHash;

      if (nextUrl !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.replaceState({}, "", nextUrl);
      }
    }, Math.max(0, delayMs));

    return () => clearTimeout(timer);
  }, [preserveParams, removeParams, removeHash, delayMs]);

  return null;
}