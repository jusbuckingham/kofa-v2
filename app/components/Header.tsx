'use client';

import Image from 'next/image';
import NewsTicker from './NewsTicker';

export default function Header() {
  return (
    <header className="flex flex-col w-full">
      {/* Top gradient bar */}
      <div className="flex justify-between items-center bg-gradient-to-r from-yellow-500 via-pink-500 to-red-500 py-3 px-6">
        <div className="flex items-center space-x-4">
          <Image
            src="/images/image.png"
            alt="Kofa AI logo"
            width={32}
            height={32}
          />
          {/* Optional: add site title here */}
        </div>
      </div>

      {/* News ticker below */}
      <div className="w-full bg-black">
        <NewsTicker />
      </div>
    </header>
  );
}
