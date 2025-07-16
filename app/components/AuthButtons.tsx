"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButtons() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (session?.user) {
    return (
      <button
        onClick={() => signOut()}
        aria-label="Sign out"
        className="text-sm text-red-200 hover:underline"
      >
        Sign Out
      </button>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      aria-label="Sign in"
      className="text-sm text-blue-500 hover:underline"
    >
      Sign In
    </button>
  );
}