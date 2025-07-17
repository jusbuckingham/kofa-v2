// app/pricing/page.tsx
"use client";

import React, { useState } from "react";
import PricingCard, { Plan } from "../components/PricingCard";

export default function PricingPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const { url } = (await res.json()) as { url: string };
      if (url) {
        window.location.href = url;
      } else {
        console.error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const plans: Plan[] = [
    {
      name: "Free Tier",
      price: "3 free stories per day",
      features: [
        "Daily limit: 3 articles",
        "Access to summaries",
        "No subscription required",
      ],
      buttonText: "Current Plan",
      disabled: true,
    },
    {
      name: "Pro Tier",
      price: "$9.99 / month",
      features: ["Unlimited stories", "Priority support", "Cancel anytime"],
      buttonText: isLoading ? "Loading..." : "Subscribe Now",
      disabled: isLoading,
      onClick: handleCheckout,
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {plans.map((plan) => (
          <PricingCard key={plan.name} plan={plan} />
        ))}
      </div>
    </main>
  );
}