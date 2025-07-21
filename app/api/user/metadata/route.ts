import Stripe from "stripe";

export function isSubscribedFromStripeObjects(
  customer: { subscriptions?: { data?: Stripe.Subscription[] } }
): boolean {
  if (!customer.subscriptions || !customer.subscriptions.data) return false;
  const SUBSCRIPTION_ACTIVE_STATUSES = ["trialing", "active"];
  return customer.subscriptions.data.some((s) =>
    SUBSCRIPTION_ACTIVE_STATUSES.includes(s.status)
  );
}