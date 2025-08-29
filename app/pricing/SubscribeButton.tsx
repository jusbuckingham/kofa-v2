"use client";

import React, { useState } from "react";

const planLabel = process.env.NEXT_PUBLIC_STRIPE_PLAN_LABEL || "$5/month";

export default function SubscribeButton() {
  const [loading, setLoading] = useState(false);
  // Only use the public environment variable to avoid leaking secrets
  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;

  function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "object" && err !== null && "message" in err) {
      const m = (err as Record<string, unknown>).message;
      if (typeof m === "string") return m;
    }
    return "An unexpected error occurred.";
  }

  const handleSubscribe = async () => {
    if (!priceId) {
      throw new Error("Stripe price ID is not configured. Please set NEXT_PUBLIC_STRIPE_PRICE_ID.");
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (!res.ok) {
        let message = "Failed to create checkout session.";
        try {
          const errorData = await res.json();
          if (errorData?.error) {
            message += ` ${errorData.error}`;
          }
        } catch {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }

      const { url } = await res.json();
      if (!url) {
        throw new Error("Missing checkout URL.");
      }

      window.location.href = url;
    } catch (err: unknown) {
      console.error("Subscription error:", err);
      const message = getErrorMessage(err);
      alert(
        message
          ? `There was a problem creating the checkout session: ${message}`
          : "There was a problem creating the checkout session. Please try again."
      );
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
      {loading ? "Redirecting..." : `Subscribe (${planLabel})`}
    </button>
  );
}