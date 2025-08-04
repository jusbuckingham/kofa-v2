"use client";

import React from 'react';

interface SubscribeButtonProps {
  priceId: string;
}

export default function SubscribeButton({ priceId }: SubscribeButtonProps) {
  const handleSubscribe = async () => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error('Failed to create checkout session', err);
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      aria-label="Subscribe to Pro Plan"
      className="mt-6 w-full px-4 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700 transition-colors duration-200"
    >
      Subscribe
    </button>
  );
}