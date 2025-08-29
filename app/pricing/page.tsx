// app/pricing/page.tsx

import { Metadata } from 'next';
import SubscribeButton from './SubscribeButton';

export const metadata: Metadata = {
  title: 'Pricing – Kofa',
};

export default function PricingPage() {
  return (
    <main className="w-full bg-gray-50 min-h-screen flex flex-col items-center p-6">
      <h1 className="text-5xl font-extrabold mb-12">Pricing</h1>
      <section className="flex flex-col md:flex-row gap-8 max-w-4xl w-full justify-center">
        <div className="bg-white shadow-md rounded-lg p-10 w-full md:w-1/2 text-center">
          <h2 className="text-3xl font-semibold mb-4">Free Plan</h2>
          <p className="text-gray-700 text-lg mb-6">
            Access up to 7 free stories per day.
          </p>
          <p className="text-4xl font-bold mb-8">Free</p>
          <button
            className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition"
            type="button"
          >
            Get Started
          </button>
        </div>
        <div className="bg-white shadow-md rounded-lg p-10 w-full md:w-1/2 text-center">
          <h2 className="text-3xl font-semibold mb-4">Pro Plan</h2>
          <p className="text-gray-700 text-lg mb-6">
            Unlimited access to all summaries, priority updates.
          </p>
          <p className="text-4xl font-bold mb-8">$5/month</p>
          <div className="flex justify-center">
            <SubscribeButton />
          </div>
        </div>
      </section>
    </main>
  );
}