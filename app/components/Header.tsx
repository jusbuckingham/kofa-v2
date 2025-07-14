"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

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
          Kofa AI
        </Link>
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
                session.user.subscriptionStatus === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {session.user.subscriptionStatus === "active"
                ? "Pro Member"
                : "Free Tier"}
            </span>
            <button
              onClick={() => signOut()}
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