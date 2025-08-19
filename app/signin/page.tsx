"use client";

import React, { useState, useEffect } from "react";
import { getCsrfToken, signIn } from "next-auth/react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getCsrfToken();
        setCsrfToken(token ?? null);
      } catch {
        // silently ignore; NextAuth will still work without prefetching
        setCsrfToken(null);
      }
    })();
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      // Send magic link and return user to current page after auth
      const cb = typeof window !== "undefined" ? window.location.href : "/dashboard";
      const res = await signIn("email", { email: email.trim(), callbackUrl: cb, redirect: true });
      // If redirect: true, control usually doesn't reach here on success.
      // Keep for completeness; if res?.error exists, surface it.
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
          {csrfToken && <input name="csrfToken" type="hidden" defaultValue={csrfToken} />}

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