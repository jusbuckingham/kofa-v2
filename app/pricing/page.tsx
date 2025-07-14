"use client";

import React from "react";

export default function PricingPage() {
  const handleSubscribe = () => {
    // Redirect to your Checkout API route
    window.location.href = "/api/stripe/checkout";
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Free Tier */}
        <div className="bg-white p-8 rounded-lg shadow-md flex flex-col">
          <h2 className="text-2xl font-semibold mb-4">Free Tier</h2>
          <p className="text-lg mb-6">3 free stories per day</p>
          <ul className="mb-6 space-y-2 list-disc list-inside">
            <li>Daily limit: 3 articles</li>
            <li>Access to summaries</li>
            <li>No subscription required</li>
          </ul>
          <button
            disabled
            className="mt-auto px-6 py-3 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
          >
            Current Plan
          </button>
        </div>

        {/* Pro Tier */}
        <div className="bg-white p-8 rounded-lg shadow-md flex flex-col border-2 border-blue-600">
          <h2 className="text-2xl font-semibold mb-4">Pro Tier</h2>
          <p className="text-lg mb-6">$9.99 / month</p>
          <ul className="mb-6 space-y-2 list-disc list-inside">
            <li>Unlimited stories</li>
            <li>Priority support</li>
            <li>Cancel anytime</li>
          </ul>
          <button
            onClick={handleSubscribe}
            className="mt-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Subscribe Now
          </button>
        </div>
      </div>
    </main>
  );
}