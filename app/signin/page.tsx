"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validEmail = (value: string) => /.+@.+\..+/.test(value.trim());

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!validEmail(trimmed)) {
      setError("Please enter a valid email.");
      return;
    }

    setSubmitting(true);
    try {
      const callbackUrl = typeof window !== "undefined" ? window.location.origin + "/dashboard" : "/dashboard";
      // With redirect: true, NextAuth will navigate after a successful request
      const res = await signIn("email", { email: trimmed, callbackUrl, redirect: true });
      // If an error is returned (rare with redirect: true), surface it
      if (res && (res as unknown as { error?: string }).error) {
        setError("Could not send sign-in link. Please try again.");
      }
    } catch {
      setError("Something went wrong sending your sign-in link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign in</h1>

        <form onSubmit={handleEmailSubmit} noValidate>
          <label htmlFor="email" className="block mb-2">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            className="mt-1 w-full px-3 py-2 border rounded"
            aria-invalid={!!error}
            aria-describedby={error ? "email-error" : undefined}
          />

          {error && (
            <p id="email-error" className="mt-2 text-sm text-red-600" aria-live="polite">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={submitting || !email.trim()}
          >
            {submitting ? "Sending…" : "Send Magic Link"}
          </button>
        </form>
      </div>
    </div>
  );
}