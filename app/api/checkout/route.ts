import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getSession, clearSession } from "@/lib/session";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

// Countries where we handle payments ourselves (regular checkout)
const REGULAR_PAYMENT_COUNTRIES = new Set([
  // EU 27
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // Other
  "AU", "MY", "NO", "CH", "NZ", "CA", "SG", "JP", "US",
]);

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(`${APP_URL}/app-sprint-community?error=session_expired`);
  }

  try {
    const headersList = await headers();
    const country = headersList.get("x-vercel-ip-country") ?? "";
    const useManagedPayments = !REGULAR_PAYMENT_COUNTRIES.has(country);

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
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
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
    };

    if (useManagedPayments) {
      // Stripe handles tax, address collection, and payment methods
      (sessionParams as any).managed_payments = { enabled: true };
    } else {
      // We handle tax and address collection ourselves
      sessionParams.automatic_tax = { enabled: true };
      sessionParams.customer_update = { address: "auto" };
    }

    const checkoutSession = await stripe.checkout.sessions.create(
      sessionParams as any,
    );

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
