'use client'
import React from 'react'
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl mb-4">Please Log In</h1>
      <Link href="/api/auth/login">
        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          Log In
        </button>
      </Link>
    </main>
  )
}