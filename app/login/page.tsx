'use client'
import React from 'react'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl mb-4">Please Log In</h1>
      <a href="/api/auth/login">
        <button className="px-4 py-2 bg-blue-600 text-white rounded">
          Log In
        </button>
      </a>
    </main>
  )
}