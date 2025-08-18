/**
 * Shared business constants & helpers used for metered paywall + subscriptions.
 */

export type SubscriptionStatus = "active" | "trialing" | "canceled" | "none";

// Number of free story summary reads per (UTC) day for non‑subscribed users.
export const FREE_DAILY_STORY_LIMIT =
  Number.isFinite(Number(process.env.FREE_DAILY_LIMIT))
    ? Number(process.env.FREE_DAILY_LIMIT)
    : 3;

// Statuses that should be treated as “paid / unlimited”.
export const SUBSCRIPTION_ACTIVE_STATUSES: readonly SubscriptionStatus[] = ["active", "trialing"] as const;

/** Returns today's date in UTC in YYYY-MM-DD format. */
export function todayUtcISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns today's UTC date at midnight as a Date object. */
export function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** True if the given status represents an active, paying (or trialing) customer. */
export const isActiveSub = (status?: SubscriptionStatus | string): boolean =>
  SUBSCRIPTION_ACTIVE_STATUSES.includes(((status as SubscriptionStatus) ?? "none"));

/** True if a non‑subscribed user has already hit the free daily limit. */
export const isOverFreeLimit = (count: number, status?: SubscriptionStatus | string): boolean =>
  !isActiveSub(status) && count >= FREE_DAILY_STORY_LIMIT;

/**
 * Returns true if the given Stripe Customer object (or subset) has at least one
 * subscription in an active or trialing status.
 */
export function isSubscribedFromStripeObjects(customer: {
  subscriptions?: { data?: Array<{ status: string }> };
}): boolean {
  const subs = customer?.subscriptions?.data;
  if (!Array.isArray(subs)) return false;
  return subs.some((s) => isActiveSub(s.status));
}