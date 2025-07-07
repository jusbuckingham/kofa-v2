'use client';

import React from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-nextjs';

export default function AuthButtons() {
  const { user, isLoading, login, logout } = useKindeAuth();
  const isAuthenticated = Boolean(user);

  if (isLoading) {
    return (
      <button className="px-2 py-1 opacity-50" disabled>
        Signing in…
      </button>
    );
  }

  return isAuthenticated ? (
    <button
      onClick={() => logout()}
      className="px-2 py-1 bg-red-600 text-white rounded"
    >
      Log Out
    </button>
  ) : (
    <button
      onClick={() => login()}
      className="px-2 py-1 bg-yellow-500 text-black rounded"
    >
      Log In
    </button>
  );
}