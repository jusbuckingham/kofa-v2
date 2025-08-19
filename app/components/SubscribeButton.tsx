'use client';
import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';

type CheckoutResp = { url?: string; error?: string };

export default function SubscribeButton() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  const hasActiveSub: boolean = Boolean((session as unknown as { user?: { hasActiveSub?: boolean } })?.user?.hasActiveSub);

  const goToPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'portal' }),
      });
      const data: CheckoutResp = await res.json().catch(() => ({} as CheckoutResp));
      if (!res.ok || !data.url) throw new Error(data.error || 'Unable to open portal');
      window.location.assign(data.url);
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data: CheckoutResp = await res.json().catch(() => ({} as CheckoutResp));
      if (!res.ok || !data.url) throw new Error(data.error || 'Checkout failed');
      window.location.assign(data.url);
    } catch (err) {
      console.error(err);
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    if (status !== 'authenticated' || !session) {
      // Redirect to sign-in, then return to this page
      const cb = typeof window !== 'undefined' ? window.location.href : '/';
      await signIn(undefined, { callbackUrl: cb });
      return;
    }
    if (hasActiveSub) {
      void goToPortal();
    } else {
      void startCheckout();
    }
  };

  const label = status === 'loading'
    ? 'Loading…'
    : hasActiveSub
    ? 'Manage Subscription'
    : 'Subscribe $5/mo';

  const disabled = loading || status === 'loading';

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
      className={`px-6 py-3 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        disabled ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {label}
    </button>
  );
}