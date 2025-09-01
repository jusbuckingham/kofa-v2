'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// Narrower typing for what we actually render
type SubStatus =
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'unpaid';

type Sub = {
  id: string;
  status: SubStatus;
  current_period_end: number; // epoch seconds
  plan: string; // human label we compute server-side
  cancel_at_period_end?: boolean; // whether it will end at period end
};

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export default function ManageSubscriptionPage() {
  const { status } = useSession();
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/subscription', { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const { data } = (await res.json()) as { data: Sub | null };
      setSub(data ?? null);
    } catch {
      setSub(null);
      setError("We couldn't load your subscription right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void load();
  }, [status, load]);

  const handlePortal = async () => {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'portal' }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data?.url) {
        const fallback = (await res.text().catch(() => '')).trim();
        setError(data?.error || fallback || 'Could not open billing portal.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not open billing portal.');
    } finally {
      setPortalLoading(false);
    }
  };

  if (status === 'loading') return <p className="px-4 py-6" role="status" aria-live="polite">Checking session…</p>;
  if (status !== 'authenticated') {
    return (
      <section className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Manage Subscription</h1>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
          {'Please log in to manage your subscription.'}
        </p>
        <div className="mt-4">
          <Link
            href="/login"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Log in
          </Link>
        </div>
      </section>
    );
  }

  if (loading) return <p className="px-4 py-6">Loading subscription…</p>;

  if (!sub) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Manage Subscription</h1>
        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}
        <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
          {'You do not have an active subscription.'}
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            View Plans
          </Link>
          <button
            onClick={load}
            className="inline-flex items-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  const endDate = new Date(sub.current_period_end * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const statusBadgeColor: Record<SubStatus, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
    trialing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
    canceled: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
    incomplete: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200',
    incomplete_expired: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200',
    past_due: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200',
    unpaid: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200',
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Manage Subscription</h1>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-200" role="status" aria-live="polite">
          {error}
        </div>
      )}

      <div className="mt-5 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Current plan</p>
            <p className="text-lg font-medium">{sub.plan}</p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${statusBadgeColor[sub.status]}`}>
            <span className="h-2 w-2 rounded-full bg-current" />
            {sub.status.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">
          {sub.cancel_at_period_end || sub.status === 'canceled' ? (
            <>Ends on: <span className="font-medium">{endDate}</span></>
          ) : (
            <>Next renewal: <span className="font-medium">{endDate}</span></>
          )}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            aria-busy={portalLoading}
          >
            {portalLoading && <Spinner />}
            <span>Manage in Customer Portal</span>
          </button>
          <button
            onClick={load}
            className="inline-flex items-center rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Refresh
          </button>
        </div>
      </div>
    </section>
  );
}