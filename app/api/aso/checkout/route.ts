import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

const PRICE_MAP: Record<string, string> = {
  "solo-month": process.env.ASO_SOLO_MONTHLY_PRICE_ID!,
  "solo-year": process.env.ASO_SOLO_YEARLY_PRICE_ID!,
  "pro-month": process.env.ASO_PRO_MONTHLY_PRICE_ID!,
  "pro-year": process.env.ASO_PRO_YEARLY_PRICE_ID!,
};

export async function POST(request: NextRequest) {
  try {
    const { plan, interval } = (await request.json()) as {
      plan: string;
      interval: string;
    };

    const priceId = PRICE_MAP[`${plan}-${interval}`];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan or interval" }, { status: 400 });
    }

    const product = plan === "solo" ? "aso-solo" : "aso-pro";

    const cookieStore = await cookies();
    const visitorId = cookieStore.get("visitor_id")?.value || "";
    const country = request.headers.get("cf-ipcountry") || "";

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: {
          trial_period_days: 7,
          metadata: { product, interval, visitorId, country },
        },
        payment_method_collection: "always",
        managed_payments: { enabled: true },
        success_url: `${APP_URL}/aso/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/aso?status=canceled`,
      } as any,
      {
        apiVersion: "2026-03-04.preview" as any,
      }
    );

    // Track stripe_shown event
    if (visitorId) {
      await prisma.pageEvent.upsert({
        where: { sessionId_type_product: { sessionId: visitorId, type: "stripe_shown", product } },
        create: { product, type: "stripe_shown", visitorId, sessionId: visitorId, country: country || null },
        update: {},
      }).catch(() => {});
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[ASO Checkout] Error:", err);
    return NextResponse.json(
      { error: "Checkout failed" },
      { status: 500 }
    );
  }
}
