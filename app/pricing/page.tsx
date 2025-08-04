// app/pricing/page.tsx

import { Metadata } from 'next';
import SubscribeButton from './SubscribeButton';

export const metadata: Metadata = {
  title: 'Pricing – Kofa',
};

export default function PricingPage() {
  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
  if (!priceId) {
    return (
      <main className="max-w-md mx-auto p-6 flex flex-col items-center space-y-4">
        <h1 className="text-3xl font-extrabold">Pricing</h1>
        <div className="text-red-600 flex flex-col items-center space-y-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-center text-lg font-medium">
            Pricing information is currently unavailable. Please check back shortly.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight">Pricing</h1>
      </header>
      <section className="border rounded-lg p-8 space-y-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Pro Plan</h2>
        <p className="text-gray-700 text-base">Unlimited access to all summaries.</p>
        <p className="text-3xl font-bold">$5/month</p>
        <SubscribeButton priceId={priceId} />
      </section>
    </main>
  );
}