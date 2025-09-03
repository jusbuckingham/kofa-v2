import Stripe from "stripe";

// Read once; don’t throw at import time so non-Stripe pages can still build/run.
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Narrowed global cache to avoid polluting types in dev/reload cycles
type StripeGlobal = { stripeInstance?: Stripe | null };
const globalForStripe = globalThis as unknown as StripeGlobal;

// Lazily create a singleton Stripe instance when key is present
const stripe: Stripe | null =
  typeof globalForStripe.stripeInstance !== "undefined"
    ? globalForStripe.stripeInstance
    : stripeSecretKey
    ? new Stripe(stripeSecretKey, { apiVersion: "2022-11-15" })
    : null;

if (process.env.NODE_ENV === "development") {
  // Cache across HMR reloads to prevent re-instantiation
  globalForStripe.stripeInstance = stripe;
}

// Optional helper for routes to check quickly
export const isStripeConfigured = Boolean(stripe);

export { stripe };

// In dev, warn (don’t crash) when the key is missing to aid debugging
if (!stripeSecretKey && process.env.NODE_ENV !== "test") {
  console.warn("[stripe] STRIPE_SECRET_KEY is not set; Stripe features are disabled.");
}