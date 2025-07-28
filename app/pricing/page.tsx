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
      <main className="max-w-md mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Pricing</h1>
        <p className="text-red-600">Pricing is currently unavailable. Please try again later.</p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Pricing</h1>
      <div className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Pro Plan</h2>
        <p>Unlimited access to all summaries.</p>
        <p className="text-2xl font-bold">$5/month</p>
        <SubscribeButton priceId={priceId} />
      </div>
    </main>
  );
}