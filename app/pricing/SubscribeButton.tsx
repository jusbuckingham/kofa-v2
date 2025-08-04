"use client";

import React, { useState } from "react";

interface SubscribeButtonProps {
  priceId: string;
}

export default function SubscribeButton({ priceId }: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (!res.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await res.json();
      if (!url) {
        throw new Error("Missing checkout URL");
      }

      window.location.href = url;
    } catch (err) {
      console.error("Subscription error:", err);
      alert("There was a problem creating the checkout session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSubscribe}
      aria-label="Subscribe to Pro Plan"
      disabled={loading}
      className={`mt-6 w-full px-4 py-3 rounded-lg font-semibold shadow-sm transition-colors duration-200 ${
        loading
          ? "bg-gray-400 cursor-not-allowed text-white"
          : "bg-green-600 text-white hover:bg-green-700"
      }`}
    >
      {loading ? "Redirecting..." : "Subscribe"}
    </button>
  );
}