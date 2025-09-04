"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import SubscribeButton from "../components/SubscribeButton";

type ReadResp = {
  hasActiveSub?: boolean;
  allowed?: boolean;
  summariesToday?: number;
  limit?: number;
};

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [readInfo, setReadInfo] = useState<ReadResp | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setApiLoading(true);
        const res = await fetch("/api/user/read", { cache: "no-store" });
        const json: ReadResp = await res.json();
        if (mounted) setReadInfo(json);
      } catch {
        // ignore network/API errors and fall back to session-only state
      } finally {
        if (mounted) setApiLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const loading = status === "loading" || apiLoading;
  const isPro = Boolean(session?.user?.hasActiveSub || readInfo?.hasActiveSub);

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-gray-600">
          {loading
            ? "Loading your subscription status…"
            : isPro
            ? "You’re on the Pro plan. Thanks for supporting Kofa!"
            : "You’re on the Free plan. Upgrade to unlock unlimited summaries."}
        </p>
      </header>

      <section className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Current plan</div>
            <div className="text-base font-medium">{isPro ? "Pro" : "Free"}</div>
          </div>
          {/* SubscribeButton reads session internally and flips to Manage when Pro */}
          <SubscribeButton />
        </div>
      </section>
    </main>
  );
}