import { NextResponse } from "next/server";
import Stripe from "stripe";
import clientPromise from "@/lib/mongodb";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2022-11-15",
});

export async function POST(request: Request) {
  // 1. Read the raw body and signature
  const buf = await request.text();
  const sig = request.headers.get("stripe-signature")!;
  let event: Stripe.Event;

  // 2. Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Webhook signature verification failed:", message);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  // 3. Connect to Mongo and grab the users collection
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME || "kofa");
  const users = db.collection("users");

  // 4. Handle the event types
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;
      await users.updateOne(
        { stripeCustomerId: customerId },
        { $set: { subscriptionStatus: "active" } }
      );
      break;
    }
    case "customer.subscription.updated":
    case "invoice.paid": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const isActive = subscription.status === "active";
      await users.updateOne(
        { stripeCustomerId: customerId },
        { $set: { subscriptionStatus: isActive ? "active" : "inactive" } }
      );
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      await users.updateOne(
        { stripeCustomerId: customerId },
        { $set: { subscriptionStatus: "inactive" } }
      );
      break;
    }
    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  // 5. Return a 200 to acknowledge receipt
  return NextResponse.json({ received: true });
}