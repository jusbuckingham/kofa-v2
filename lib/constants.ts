

/**
 * Global constant values used across the application.
 * Centralizing these helps avoid magic numbers / strings scattered in code.
 */

export const FREE_DAILY_LIMIT = 3; // Number of free story summary reads per (UTC) day for non-subscribed users.

export const SUBSCRIPTION_ACTIVE_STATUSES = ["active", "trialing"] as const;

export type SubscriptionStatus = "active" | "trialing" | "canceled" | "none";

/**
 * Returns today's date in UTC in YYYY-MM-DD format.
 * (We keep it here so both client and server utilities can share the same logic.)
 */
export function todayUtcISO(): string {
  return new Date().toISOString().slice(0, 10);
}