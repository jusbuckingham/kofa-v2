'use client';
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';

type UnknownRecord = Record<string, unknown>;

interface SessionUser extends UnknownRecord {
  hasActiveSub?: boolean;
}

interface SessionData extends UnknownRecord {
  user?: SessionUser;
}

interface CheckoutResp {
  url?: string;
  error?: string;
}

function isSessionUser(obj: unknown): obj is SessionUser {
  return typeof obj === 'object' && obj !== null && 'hasActiveSub' in (obj as UnknownRecord);
}

function isSessionData(obj: unknown): obj is SessionData {
  if (typeof obj !== 'object' || obj === null) return false;
  const rec = obj as UnknownRecord;
  const user = rec.user as unknown;
  return typeof user === 'object' && user !== null && isSessionUser(user);
}

async function fetchJson(url: string, options?: RequestInit): Promise<CheckoutResp> {
  const res = await fetch(url, options);
  let data: CheckoutResp = {};
  try {
    data = await res.json();
  } catch {
    // ignore JSON parse errors, leave data as empty object
  }
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export default function SubscribeButton() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  const hasActiveSub = isSessionData(session) && session.user?.hasActiveSub === true;

  const goToPortal = async () => {
    setLoading(true);
    try {
      const data = await fetchJson('/api/stripe/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'portal' }),
      });
      window.location.assign(data.url!);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Unable to open portal');
    } finally {
      setLoading(false);
    }
  };

  const startCheckout = async () => {
    setLoading(true);
    try {
      const data = await fetchJson('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      window.location.assign(data.url!);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async () => {
    if (loading || status === 'loading') return;
    if (status !== 'authenticated' || !session) {
      const callbackUrl = typeof window !== 'undefined' ? window.location.href : '/';
      await signIn(undefined, { callbackUrl });
      return;
    }
    if (hasActiveSub) {
      void goToPortal();
    } else {
      void startCheckout();
    }
  };

  const label =
    status === 'loading'
      ? 'Loading…'
      : hasActiveSub
      ? 'Manage Subscription'
      : 'Subscribe $5/mo';

  const disabled = loading || status === 'loading';

  if (hasActiveSub) {
    return (
      <Link
        href="/account/subscription"
        className="px-6 py-3 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center justify-center"
      >
        Manage Subscription
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-busy={loading}
      aria-disabled={disabled}
      className={`px-6 py-3 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        disabled ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {label}
    </button>
  );
}