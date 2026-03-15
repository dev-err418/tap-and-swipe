import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getSession, clearSession } from "@/lib/session";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const COMMUNITY_PRICE_ID = process.env.COMMUNITY_PRICE_ID!;

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(`${APP_URL}/app-sprint-community?error=session_expired`);
  }

  try {
    const headersList = await headers();
    const country = headersList.get("cf-ipcountry") || "";

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

    const cookieStore = await cookies();
    const visitorId = cookieStore.get("visitor_id")?.value || "";

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        customer: customerId,
        mode: "subscription",
        line_items: [
          { price: COMMUNITY_PRICE_ID, quantity: 1 },
        ],
        subscription_data: {
          metadata: { product: "bundle-community", discordId: session.discordId, visitorId, country },
        },
        managed_payments: { enabled: true },
        success_url: `${APP_URL}/app-sprint-community?status=success`,
        cancel_url: `${APP_URL}/app-sprint-community?status=canceled`,
      } as any,
      {
        apiVersion: "2026-03-04.preview" as any,
      }
    );

    // Track stripe_shown event
    if (visitorId) {
      await prisma.pageEvent.upsert({
        where: { sessionId_type_product: { sessionId: visitorId, type: "stripe_shown", product: "bundle-community" } },
        create: { product: "bundle-community", type: "stripe_shown", visitorId, sessionId: visitorId, country: country || null, stripeCustomerId: customerId },
        update: {},
      }).catch(() => {});
    }

    await clearSession();

    return NextResponse.redirect(checkoutSession.url!);
  } catch (err) {
    console.error("[Community Bundle Checkout] Error:", err);
    return NextResponse.redirect(`${APP_URL}/app-sprint-community?error=checkout_failed`);
  }
}
