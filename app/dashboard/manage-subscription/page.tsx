'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

type Sub = {
  id: string;
  status: string;
  current_period_end: number;
  plan: string;
};

export default function ManageSubscriptionPage() {
  const { data: session } = useSession();
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetch('/api/stripe/subscription')
      .then((res) => res.json())
      .then(({ data }) => {
        setSub(data);
        setLoading(false);
      });
  }, [session]);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel?')) return;
    setCanceling(true);
    const res = await fetch('/api/stripe/subscription/cancel', {
      method: 'POST',
    });
    if (res.ok) {
      setSub(null);
      alert('Subscription canceled.');
    } else {
      const { error } = await res.json();
      alert('Error: ' + error);
    }
    setCanceling(false);
  };

  if (!session) return <p>Please log in to manage your subscription.</p>;
  if (loading) return <p>Loading subscription...</p>;
  if (!sub) return <p>You don’t have an active subscription.</p>;

  const endDate = new Date(sub.current_period_end * 1000).toLocaleDateString();

  return (
    <div>
      <h1>Manage Subscription</h1>
      <p>Plan: {sub.plan}</p>
      <p>Status: {sub.status}</p>
      <p>Current period ends: {endDate}</p>
      <button onClick={handleCancel} disabled={canceling}>
        {canceling ? 'Canceling…' : 'Cancel Subscription'}
      </button>
    </div>
  );
}