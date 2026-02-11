import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getSession, clearSession } from "@/lib/session";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(`${APP_URL}/app-sprint?error=session_expired`);
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

    // Read DataFast cookies for attribution
    const cookieStore = await cookies();
    const datafastVisitorId = cookieStore.get("datafast_visitor_id")?.value;
    const datafastSessionId = cookieStore.get("datafast_session_id")?.value;

    // Create Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      metadata: {
        ...(datafastVisitorId && { datafast_visitor_id: datafastVisitorId }),
        ...(datafastSessionId && { datafast_session_id: datafastSessionId }),
      },
      subscription_data: {
        metadata: { discordId: session.discordId },
      },
      success_url: `${APP_URL}/app-sprint?status=success`,
      cancel_url: `${APP_URL}/app-sprint?status=canceled`,
    });

    // Fire DataFast goal for Stripe checkout shown
    if (datafastVisitorId && process.env.DATAFAST_API_KEY) {
      fetch("https://datafa.st/api/v1/goals", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DATAFAST_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          datafast_visitor_id: datafastVisitorId,
          name: "stripe_checkout_shown",
        }),
      }).catch(() => {}); // fire-and-forget, don't block checkout
    }

    await clearSession();

    return NextResponse.redirect(checkoutSession.url!);
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.redirect(`${APP_URL}/app-sprint?error=checkout_failed`);
  }
}
