import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { addRole, removeRole } from "@/lib/discord";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const discordId = subscription.metadata.discordId;
        if (!discordId) break;

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            stripeCustomerId: session.customer as string,
            roleGranted: true,
          },
        });

        await addRole(discordId);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const discordId = subscription.metadata.discordId;
        if (!discordId) break;

        const isActive = ["active", "trialing"].includes(subscription.status);

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionStatus: subscription.status,
            roleGranted: isActive,
          },
        });

        if (isActive) {
          await addRole(discordId);
        } else {
          await removeRole(discordId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const discordId = subscription.metadata.discordId;
        if (!discordId) break;

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionStatus: "canceled",
            subscriptionId: null,
            roleGranted: false,
          },
        });

        await removeRole(discordId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetails = invoice.parent?.subscription_details;
        const subscriptionId =
          typeof subDetails?.subscription === "string"
            ? subDetails.subscription
            : subDetails?.subscription?.id;
        if (!subscriptionId) break;

        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        const discordId = subscription.metadata.discordId;
        if (!discordId) break;

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionStatus: "past_due",
            roleGranted: false,
          },
        });

        await removeRole(discordId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
