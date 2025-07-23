import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    console.error("❌ Webhook signature verify failed:", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // We care about these events
  const relevant = new Set<Stripe.Event["type"]>([
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ]);

  if (!relevant.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const db = (await clientPromise).db();
  const users = db.collection("user_metadata"); // keep in sync with read/quota route

  const upsertUserByCustomer = async ({
    customerId,
    email,
    subscription,
  }: {
    customerId: string;
    email?: string | null;
    subscription?: Stripe.Subscription | null;
  }) => {
    const hasActiveSub =
      subscription?.status === "active" || subscription?.status === "trialing";

    await users.updateOne(
      email
        ? { $or: [{ stripeCustomerId: customerId }, { email }] }
        : { stripeCustomerId: customerId },
      {
        $set: {
          stripeCustomerId: customerId,
          hasActiveSub,
          subscriptionStatus: subscription?.status ?? null,
          subscriptionCurrentPeriodEnd: subscription?.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
        },
      },
      { upsert: true }
    );
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string | undefined;

        let subscription: Stripe.Subscription | null = null;
        if (subscriptionId) {
          subscription = await stripe.subscriptions.retrieve(subscriptionId);
        }

        await upsertUserByCustomer({
          customerId,
          email: session.customer_details?.email ?? null,
          subscription,
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertUserByCustomer({
          customerId: subscription.customer as string,
          subscription,
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    console.error("Webhook handler error:", (err as Error).message);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}