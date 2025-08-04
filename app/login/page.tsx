'use client'
import React from 'react'
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl mb-4">Please Log In</h1>
      <Link
        href="/api/auth/login"
        aria-label="Log in to your Kofa account"
        className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors duration-200"
      >
        Log In
      </Link>
    </main>
  )
}