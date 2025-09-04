"use client";

import { useSession } from "next-auth/react";
import SubscribeButton from "../components/SubscribeButton";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const active = Boolean(session?.user?.hasActiveSub);

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-gray-600">
          {loading
            ? "Loading your subscription status…"
            : active
            ? "You’re on the Pro plan. Thanks for supporting Kofa!"
            : "You’re on the Free plan. Upgrade to unlock unlimited summaries."}
        </p>
      </header>

      <section className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Current plan</div>
            <div className="text-base font-medium">{active ? "Pro" : "Free"}</div>
          </div>
          <SubscribeButton />
        </div>
      </section>
    </main>
  );
}