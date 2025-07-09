'use client';

import Image from 'next/image';
import NewsTicker from './NewsTicker';

export default function Header() {
  return (
    <header className="flex justify-between items-center w-full max-w-6xl mx-auto py-4 px-6 bg-transparent">
      <div className="flex items-center space-x-4">
        <Image
          src="/images/image.png"
          alt="Kofa AI logo"
          width={32}
          height={32}
        />
      </div>
      <NewsTicker />
    </header>
  );
}
