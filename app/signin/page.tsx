"use client";

import React, { useState, useEffect } from "react";
import { getProviders, getCsrfToken, signIn } from "next-auth/react";
import type { ClientSafeProvider } from "next-auth/react";

export default function SignInPage() {
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);
  const [email, setEmail] = useState("");
  const [csrfToken, setCsrfToken] = useState<string>();

  useEffect(() => {
    (async () => {
      const prov = await getProviders();
      setProviders(prov || null);
      const token = await getCsrfToken();
      setCsrfToken(token ?? undefined);
    })();
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn("email", { email, callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign in</h1>


        <form onSubmit={handleEmailSubmit}>
          <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
          <label className="block mb-2">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2 border rounded"
            />
          </label>
          <button
            type="submit"
            className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Send Magic Link
          </button>
        </form>
      </div>
    </div>
  );
}