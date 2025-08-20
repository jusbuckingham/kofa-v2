// app/pricing/page.tsx

import { Metadata } from 'next';
import SubscribeButton from './SubscribeButton';

export const metadata: Metadata = {
  title: 'Pricing – Kofa',
};

export default function PricingPage() {
  return (
    <main className="w-full bg-gray-50 min-h-screen flex items-center justify-center p-6">
      <section className="bg-white shadow-md rounded-lg p-10 max-w-md w-full text-center">
        <h1 className="text-4xl font-extrabold mb-4">Pro Plan</h1>
        <p className="text-gray-700 text-lg mb-6">
          Unlimited access to all summaries, priority updates.
        </p>
        <p className="text-4xl font-bold mb-8">$5/month</p>
        <div className="flex justify-center">
          <SubscribeButton />
        </div>
      </section>
    </main>
  );
}