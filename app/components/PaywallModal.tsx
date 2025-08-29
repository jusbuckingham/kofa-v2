"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  remainingFreeReads?: number;
  totalFreeReads?: number;
}

export default function PaywallModal({
  open,
  onClose,
  remainingFreeReads = 0,
  totalFreeReads = 7,
}: PaywallModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const firstActionRef = useRef<HTMLAnchorElement>(null);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Prefer focusing the primary action; otherwise focus the panel for accessibility
    const el = firstActionRef.current ?? panelRef.current;
    el?.focus();
  }, [open]);

  function getFocusable(container: HTMLElement | null): HTMLElement[] {
    if (!container) return [];
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    return Array.from(container.querySelectorAll<HTMLElement>(selectors))
      .filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
  }

  useEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = getFocusable(panel);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !panel.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    panel.addEventListener('keydown', handleKeyDown);
    return () => {
      panel.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!open) return null;

  const safeTotal = Math.max(1, totalFreeReads);
  const used = Math.max(0, Math.min(safeTotal, safeTotal - remainingFreeReads));
  const percent = Math.min(100, Math.round((used / safeTotal) * 100));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      aria-describedby="paywall-desc"
      tabIndex={-1}
    >
      {/* Backdrop */}
      <button
        aria-label="Close paywall"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        className="relative w-full max-w-md rounded-xl bg-white shadow-xl ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-white/10 animate-scale-in"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <div className="flex items-start justify-between px-5 pt-5">
          <h2
            id="paywall-title"
            className="text-xl font-semibold tracking-tight text-neutral-800 dark:text-neutral-100"
          >
            Support Independent Black News
          </h2>
          <button
            onClick={onClose}
            className="ml-3 rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:hover:bg-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5 pt-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 space-y-4">
          <p id="paywall-desc">
            You’ve hit today’s free summaries limit ({totalFreeReads}). Keep the
            Black-centered, need‑to‑know breakdowns coming by becoming a supporter.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-600 dark:text-neutral-400">
              <span>
                Daily Summaries Used: {used}/{totalFreeReads}
              </span>
              <span>{percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
              <div
                className="h-full bg-indigo-600 transition-all dark:bg-indigo-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <ul className="space-y-2 text-sm">
            <FeatureItem>Unlimited daily news summaries (Who, What, Where, When, Why)</FeatureItem>
            <FeatureItem>Ad‑free, distraction‑free reading</FeatureItem>
            <FeatureItem>Priority feature access &amp; feedback channel</FeatureItem>
            <FeatureItem>Directly supports independent curation</FeatureItem>
          </ul>

          <div className="flex flex-col gap-3 pt-2">
            <Link
              ref={firstActionRef}
              href="/pricing"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
              prefetch={false}
              autoFocus
            >
              Subscribe Now
            </Link>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Not now
            </button>
          </div>

          <p className="pt-1 text-[11px] text-neutral-500 dark:text-neutral-500">
            We keep your reading count local &amp; reset it each day. Becoming a
            supporter removes limits and helps sustain the platform.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white dark:bg-indigo-500">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}