 // Number of free story summary reads per (UTC) day for non-subscribed users.
 export const FREE_DAILY_STORY_LIMIT = Number(process.env.FREE_DAILY_LIMIT ?? 3);

export const SUBSCRIPTION_ACTIVE_STATUSES: readonly SubscriptionStatus[] = ["active", "trialing"];

 export type SubscriptionStatus = "active" | "trialing" | "canceled" | "none";

 /** 
 * Returns today's date in UTC in YYYY-MM-DD format.
 * (We keep it here so both client and server utilities can share the same logic.)
 */
 export function todayUtcISO(): string {
   return new Date().toISOString().slice(0, 10);
 }

 /** Returns today's UTC date at midnight as a Date object. */
 export function todayUTC(): Date {
   const now = new Date();
   return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
 }

 /** 
  * Returns true if the given Stripe Customer object has at least one subscription
  * in an active or trialing status.
  */
 export function isSubscribedFromStripeObjects(
   customer: { subscriptions?: { data?: Array<{ status: SubscriptionStatus }> } }
 ): boolean {
   const subs = customer.subscriptions?.data;
   if (!Array.isArray(subs)) return false;
   return subs.some(s => SUBSCRIPTION_ACTIVE_STATUSES.includes(s.status as SubscriptionStatus));
 }