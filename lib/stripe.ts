import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY in environment variables.");
}

declare global {
  // eslint-disable-next-line no-var
  var stripeInstance: Stripe | undefined;
}

const stripe =
  global.stripeInstance ||
  new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2022-11-15",
  });

if (process.env.NODE_ENV === "development") {
  global.stripeInstance = stripe;
}

export { stripe };