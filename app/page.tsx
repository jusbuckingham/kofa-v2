'use client';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-yellow-400 via-red-500 to-pink-600 text-white px-4">
      {/* Kofa logo */}
      <Image
        src="/images/image.png"
        alt="Kofa logo"
        width={120}
        height={120}
        className="mb-6"
      />

      <h1 className="text-5xl sm:text-6xl font-extrabold mb-4">
        Kofa AI
      </h1>
      <p className="text-lg sm:text-xl max-w-2xl text-center mb-8">
        Stay informed with AI-powered news summaries delivered through a culturally conscious Black lens.
      </p>
      <a href="/login">
        <button className="px-6 py-3 bg-white hover:bg-gray-100 text-black font-semibold rounded-lg transition">
          Get Started
        </button>
      </a>
    </main>
  );
}