

// app/components/PricingCard.tsx
"use client";

import React from "react";

export type Plan = {
  name: string;
  price: string;
  features: string[];
  buttonText: string;
  disabled: boolean;
  onClick?: () => void;
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
      <p className="text-lg mb-6">{plan.price}</p>
      <ul className="mb-6 space-y-2 list-disc list-inside">
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <button
        onClick={plan.onClick}
        disabled={plan.disabled}
        className={`mt-auto px-6 py-3 rounded-lg transition ${
          plan.disabled
            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {plan.buttonText}
      </button>
    </div>
  );
}