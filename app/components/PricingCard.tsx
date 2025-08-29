// app/components/PricingCard.tsx
"use client";

import React from "react";
import Link from "next/link";
import { FiCheck } from "react-icons/fi";

export type Plan = {
  name: string;
  price: string;
  features: string[];
  buttonText: string;
  disabled: boolean;
  featured?: boolean; // if true, highlight CTA (pulse/ring)
  href?: string; // optional: if present and not disabled, render a Link
  onClick?: () => void; // optional: used when no href
};

interface PricingCardProps {
  plan: Plan;
}

export default function PricingCard({ plan }: PricingCardProps) {
  return (
    <div
      className={`group relative rounded-lg shadow-md flex flex-col border transition ${
        !plan.disabled
          ? "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-400 hover:shadow-lg hover:-translate-y-0.5"
          : "bg-white border-gray-200 opacity-75 grayscale"
      }`}
      aria-disabled={plan.disabled || undefined}
      title={plan.disabled ? "This plan is coming soon" : undefined}
    >
      <div
        className={`h-1 rounded-t-lg ${
          !plan.disabled ? "bg-blue-600 group-hover:bg-blue-700" : "bg-gray-300"
        }`}
      />
      {plan.disabled && (
        <span className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 shadow-sm motion-safe:animate-pulse" aria-live="polite">
          Coming soon
        </span>
      )}
      <div className="p-8 flex flex-col flex-grow">
        <h2 className={`text-2xl font-semibold mb-4 ${plan.disabled ? "text-gray-800" : "text-gray-900"}`}>{plan.name}</h2>
        <p
          className={`text-4xl font-extrabold mb-6 ${plan.disabled ? "text-gray-500" : "text-blue-700"}`}
          aria-label={`Price: ${plan.price}`}
        >
          {plan.price}
        </p>
        <ul className="mb-6 space-y-3">
          {plan.features.map((feature, idx) => (
            <li key={idx} className={`flex items-center ${plan.disabled ? "text-gray-500" : "text-gray-700"}`}>
              <FiCheck
                className={`mr-2 flex-shrink-0 ${plan.disabled ? "text-gray-400" : "text-blue-600"}`}
                aria-hidden="true"
              />
              {feature}
            </li>
          ))}
        </ul>
        {plan.href && !plan.disabled ? (
          <Link
            href={plan.href}
            prefetch={false}
            aria-label={`${plan.buttonText} - ${plan.name}`}
            className={`mt-auto inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus-visible:ring-2 focus-visible:ring-blue-500 bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg ${
              plan.featured ? "ring-2 ring-blue-400/50 shadow-blue-500/20 motion-safe:animate-pulse" : ""
            }`}
          >
            {plan.buttonText}
          </Link>
        ) : (
          <button
            type="button"
            onClick={plan.onClick}
            disabled={plan.disabled}
            title={plan.disabled ? "This plan is coming soon" : undefined}
            aria-label={`${plan.buttonText} - ${plan.name}`}
            className={`mt-auto px-6 py-3 rounded-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus-visible:ring-2 focus-visible:ring-blue-500 ${
              plan.disabled
                ? "bg-gray-300 text-gray-600 cursor-not-allowed shadow-none"
                : `bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg ${plan.featured ? "ring-2 ring-blue-400/50 shadow-blue-500/20 motion-safe:animate-pulse" : ""}`
            }`}
          >
            {plan.buttonText}
          </button>
        )}
      </div>
    </div>
  );
}