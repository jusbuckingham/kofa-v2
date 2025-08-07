import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY in environment variables.");
}

declare global {
  var stripeInstance: Stripe | undefined;
}

const stripe =
  global.stripeInstance ||
  new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });

if (process.env.NODE_ENV === "development") {
  global.stripeInstance = stripe;
}

export { stripe };