

import React from "react";

export const metadata = {
  title: "Support - Kofa",
  description: "Get help and find support for using Kofa."
};

export default function SupportPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Support</h1>
      <p className="mb-4">
        Need help? We&rsquo;re here for you. Below are resources and ways to get assistance with Kofa.
      </p>
      <ul className="list-disc pl-6 space-y-2">
        <li>
          <strong>Documentation:</strong> Visit our FAQ page for common questions and guides.
        </li>
        <li>
          <strong>Email Support:</strong> Reach us anytime at{" "}
          <a href="mailto:support@kofa.ai" className="text-blue-600 underline">
            support@kofa.ai
          </a>.
        </li>
        <li>
          <strong>Community:</strong> Join the conversation in our community forum (coming soon).
        </li>
      </ul>
      <p className="mt-6">
        We aim to respond to all support inquiries within 24 hours.
      </p>
    </main>
  );
}