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

  useEffect(() => {
    let cancelled = false;
    if (status !== 'authenticated') return;
    (async () => {
      try {
        const res = await fetch('/api/stripe/subscription', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load subscription');
        const { data } = (await res.json()) as { data: Sub | null };
        if (!cancelled) setSub(data ?? null);
      } catch {
        if (!cancelled) setSub(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const handlePortal = async () => {
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'portal' }),
      });
      if (!res.ok) throw new Error('Request failed');
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error: ' + (data.error || 'Unable to open portal'));
      }
    } catch {
      alert('Error: Unable to open portal');
    }
  };

  if (status !== 'authenticated') return <p>Please log in to manage your subscription.</p>;
  if (loading) return <p>Loading subscription…</p>;
  if (!sub) {
    return (
      <div>
        <h1>Manage Subscription</h1>
        <p>You don’t have an active subscription.</p>
        <Link href="/pricing" className="inline-block mt-2 rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700">
          View Plans
        </Link>
      </div>
    );
  }

  const endDate = new Date(sub.current_period_end * 1000).toLocaleDateString();

  return (
    <div>
      <h1>Manage Subscription</h1>
      <p>Plan: {sub.plan}</p>
      <p>Status: {sub.status}</p>
      <p>Current period ends: {endDate}</p>
      <button onClick={handlePortal} style={{ marginTop: '0.5rem' }}>
        Manage in Customer Portal
      </button>
    </div>
  );
}