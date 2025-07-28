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
      className="mt-4 w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
    >
      Subscribe
    </button>
  );
}