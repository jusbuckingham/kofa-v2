import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY in environment variables.");
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY as string;

// Use a narrowed view of globalThis for caching in dev without polluting types
const globalForStripe = globalThis as unknown as { stripeInstance?: Stripe };

const stripe =
  globalForStripe.stripeInstance ||
  new Stripe(stripeSecretKey, {
    apiVersion: "2022-11-15",
  });

if (process.env.NODE_ENV === "development") {
  globalForStripe.stripeInstance = stripe;
}

export { stripe };