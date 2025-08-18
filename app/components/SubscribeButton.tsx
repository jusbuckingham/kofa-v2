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
      const data = await res.json();
      const { url, error } = data;
      if (!res.ok) {
        throw new Error(error || 'Checkout failed');
      }
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

  if (!session) {
    return (
      <button
        disabled
        className="px-6 py-3 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed font-medium"
        aria-label="Log in to subscribe"
      >
        Log in to subscribe
      </button>
    );
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={!session || loading}
      aria-label="Subscribe for $5 per month"
      className={`px-6 py-3 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        loading
          ? "bg-gray-300 text-gray-600 cursor-not-allowed"
          : "bg-blue-600 text-white hover:bg-blue-700"
      }`}
    >
      {loading ? "Loading…" : "Subscribe $5/mo"}
    </button>
  );
}