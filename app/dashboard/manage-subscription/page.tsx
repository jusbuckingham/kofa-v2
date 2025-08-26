'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type Sub = {
  id: string;
  status: string;
  current_period_end: number;
  plan: string;
};

export default function ManageSubscriptionPage() {
  const { status } = useSession();
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (status !== 'authenticated') return;
    (async () => {
      try {
        const res = await fetch('/api/stripe/subscription', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load subscription');
        const { data } = (await res.json()) as { data: Sub | null };
        if (!cancelled) {
          setSub(data ?? null);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setSub(null);
          setError('We couldn\'t load your subscription right now. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

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

  if (status === 'loading') return <p>Checking session…</p>;
  if (status !== 'authenticated') return <p>Please log in to manage your subscription.</p>;
  if (loading) return <p>Loading subscription…</p>;
  if (!sub) {
    return (
      <div>
        <h1>Manage Subscription</h1>
        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}
        <p>You don’t have an active subscription.</p>
        <Link href="/pricing" className="inline-block mt-2 rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">
          View Plans
        </Link>
      </div>
    );
  }

  const endDate = new Date(sub.current_period_end * 1000).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  return (
    <div>
      <h1>Manage Subscription</h1>
      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </div>
      )}
      <p>Plan: {sub.plan}</p>
      <p>Status: {sub.status}</p>
      <p>Current period ends: {endDate}</p>
      <button
        onClick={handlePortal}
        disabled={portalLoading}
        className="mt-2 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        aria-busy={portalLoading}
      >
        {portalLoading ? 'Opening…' : 'Manage in Customer Portal'}
      </button>
    </div>
  );
}