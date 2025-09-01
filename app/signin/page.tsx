"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

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
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/dashboard`
          : "/dashboard";

      // Use redirect:false so we can show a clear success message.
      const res = await signIn("email", {
        email: trimmed,
        callbackUrl,
        redirect: false,
      });

      // Type-narrow the response shape from NextAuth
      const ok = !!(res && ("ok" in res ? (res as { ok?: boolean }).ok : false));
      const err = res && ("error" in res ? (res as { error?: string }).error : undefined);

      if (ok && !err) {
        setSent(true);
      } else {
        setError("Could not send sign‑in link. Please try again.");
      }
    } catch {
      setError("Something went wrong sending your sign‑in link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-extrabold mb-2 text-center">Sign in</h1>
        <p className="text-center text-gray-600 mb-6">
          We’ll email you a magic link to sign in—no password needed.
        </p>

        <form onSubmit={handleEmailSubmit} noValidate aria-busy={submitting}>
          <fieldset disabled={submitting || sent} className="[&:disabled_input]:opacity-60">
            <legend className="sr-only">Email sign in</legend>

            <label htmlFor="email" className="block mb-2 font-medium text-gray-800">
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
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-invalid={!!error}
              aria-describedby={error ? "email-error" : undefined}
              placeholder="you@example.com"
            />

            {error && (
              <p id="email-error" className="mt-2 text-sm text-red-600" aria-live="polite">
                {error}
              </p>
            )}

            {sent && !error && (
              <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-700">
                Check your inbox for the magic link. It may take a minute and can land in spam.
              </div>
            )}

            <button
              type="submit"
              className="mt-4 w-full bg-blue-600 text-white py-2.5 rounded-md font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              disabled={submitting || !email.trim()}
            >
              {submitting ? "Sending…" : sent ? "Link sent" : "Send Magic Link"}
            </button>
          </fieldset>
        </form>

        <p className="mt-4 text-xs text-center text-gray-500">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline hover:text-gray-700">
            Terms
          </a>{' '}
          and acknowledge our{' '}
          <a href="/privacy" className="underline hover:text-gray-700">
            Privacy Policy
          </a>.
        </p>
      </div>
    </div>
  );
}