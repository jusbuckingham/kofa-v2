"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

interface UserWithSubscription {
  subscriptionStatus?: string;
}

export default function Header() {
  const { data: session } = useSession();
  const subscriptionStatus =
    session?.user && "subscriptionStatus" in session.user
      ? (session.user as UserWithSubscription).subscriptionStatus ?? "free"
      : "free";

  return (
    <header className="bg-gradient-to-r from-yellow-500 via-pink-500 to-red-500 py-3 px-6 mb-2 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Image
          src="/images/image.png"
          alt="Kofa AI logo"
          width={32}
          height={32}
        />
        <Link href="/" className="text-white text-xl font-bold">
          Kofa
        </Link>
        <p className="text-sm text-white/80 mt-1">
          Black culturally conscious summaries of the latest news.
        </p>
      </div>
      <nav className="flex items-center space-x-6">
        <Link href="/dashboard" className="text-white hover:underline">
          Dashboard
        </Link>
        <Link href="/pricing" className="text-white hover:underline">
          Pricing
        </Link>
        {session?.user && (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-white">{session.user.email}</span>
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                subscriptionStatus === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {subscriptionStatus === "active" ? "Pro Member" : "Free Tier"}
            </span>
            <button
              onClick={() => signOut()}
              aria-label="Sign out"
              className="text-sm text-red-200 hover:underline"
            >
              Sign Out
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}