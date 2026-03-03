import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getSession, clearSession } from "@/lib/session";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(`${APP_URL}/app-sprint-community?error=session_expired`);
  }

  try {
    // Find or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { discordId: session.discordId },
    });

    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { discordId: session.discordId },
        name: session.discordUsername,
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { discordId: session.discordId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_update: { address: "auto" },
      mode: "subscription",
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: { discordId: session.discordId },
      },
      success_url: `${APP_URL}/app-sprint-community?status=success`,
      cancel_url: `${APP_URL}/app-sprint-community?status=canceled`,
    });

    // Track stripe_shown event
    await prisma.communityEvent.upsert({
      where: { sessionId_type: { sessionId: session.discordId, type: "stripe_shown" } },
      create: { type: "stripe_shown", sessionId: session.discordId },
      update: {},
    });

    await clearSession();

    return NextResponse.redirect(checkoutSession.url!);
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.redirect(`${APP_URL}/app-sprint-community?error=checkout_failed`);
  }
}
