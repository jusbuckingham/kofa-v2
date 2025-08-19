// app/components/PricingCard.tsx
"use client";

import React from "react";
import Link from "next/link";

export type Plan = {
  name: string;
  price: string;
  features: string[];
  buttonText: string;
  disabled: boolean;
  href?: string; // optional: if present and not disabled, render a Link
  onClick?: () => void; // optional: used when no href
};

interface PricingCardProps {
  plan: Plan;
}

export default function PricingCard({ plan }: PricingCardProps) {
  return (
    <div
      className={`bg-white p-8 rounded-lg shadow-md flex flex-col ${
        !plan.disabled ? "border-2 border-blue-600" : ""
      }`}
    >
      <h2 className="text-2xl font-semibold mb-4">{plan.name}</h2>
      <p className="text-lg mb-6" aria-label={`Price: ${plan.price}`}>{plan.price}</p>
      <ul className="mb-6 space-y-2 list-disc list-inside">
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      {plan.href && !plan.disabled ? (
        <Link
          href={plan.href}
          aria-label={`${plan.buttonText} - ${plan.name}`}
          className="mt-auto inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-600 text-white hover:bg-blue-700"
        >
          {plan.buttonText}
        </Link>
      ) : (
        <button
          type="button"
          onClick={plan.onClick}
          disabled={plan.disabled}
          aria-label={`${plan.buttonText} - ${plan.name}`}
          className={`mt-auto px-6 py-3 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            plan.disabled
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {plan.buttonText}
        </button>
      )}
    </div>
  );
}