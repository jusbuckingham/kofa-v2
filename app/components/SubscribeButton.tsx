'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function SubscribeButton() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      if (!res.ok) throw new Error('Checkout failed');
      const { url } = await res.json();
      if (url) {
        window.location.assign(url);
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return <button disabled>Log in to subscribe</button>;
  return (
    <button onClick={handleSubscribe} disabled={!session || loading}>
      {loading ? 'Loading…' : 'Subscribe $5/mo'}
    </button>
  );
}