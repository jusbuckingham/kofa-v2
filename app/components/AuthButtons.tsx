"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="animate-pulse space-x-4">
        <div className="inline-block h-4 w-20 rounded bg-gray-300"></div>
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700">{session.user.email}</span>
        <button
          onClick={() => signOut()}
          aria-label="Sign out"
          className="text-sm text-red-500 hover:underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn(undefined, { callbackUrl: "/dashboard" })}
      aria-label="Sign in"
      className="text-sm text-blue-500 hover:underline"
    >
      Sign in
    </button>
  );
}