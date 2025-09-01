import SubscribeButton from "../components/SubscribeButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type UserInfo = {
  email?: string;
  hasActiveSub?: boolean;
  stripeCustomerId?: string | null;
  plan?: string | null;
  usageToday?: number;
  quota?: number;
  amount?: number | null;
  currency?: string | null;
  interval?: string | null;
  interval_count?: number | null;
  nickname?: string | null;
};

async function getUser(): Promise<UserInfo> {
  // Try absolute (Vercel) then relative (local)
  const urls = [
    (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") + "/api/user/read",
    "/api/user/read",
  ].filter(Boolean);

  for (const u of urls) {
    try {
      const res = await fetch(u, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        return (data?.user ?? {}) as UserInfo;
      }
    } catch {}
  }
  return {} as UserInfo;
}

export default async function AccountPage() {
  const user = await getUser();
  const active = Boolean(user.hasActiveSub);

  return (
    <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-xl font-semibold">Account</h1>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Email</dt>
            <dd className="text-sm text-gray-900 break-all">{user.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Subscription</dt>
            <dd className="mt-1">
              {active ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-400/30">
                  Free
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Plan</dt>
            <dd className="text-sm text-gray-900">
              {active ? (
                <>
                  {user.nickname || user.plan || "Pro"}
                  {user.amount && user.currency && user.interval ? (
                    <span className="text-gray-500">
                      {" "}
                      — ${(user.amount / 100).toFixed(0)}/{user.interval === "month" ? "mo" : user.interval}
                    </span>
                  ) : null}
                </>
              ) : (
                "Free"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Usage today</dt>
            <dd className="text-sm text-gray-900">
              {user.usageToday ?? 0} / {user.quota ?? (active ? "∞" : 5)}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <SubscribeButton />
        </div>
      </section>
    </main>
  );
}