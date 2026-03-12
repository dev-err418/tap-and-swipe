import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const ASO_PRICE_ID = process.env.ASO_PRICE_ID || "price_1T9ldIDGyKvKgBtCf9rafpe7";
const ASO_PROMO_CODE = process.env.ASO_PROMO_CODE || "promo_1T9lgHDGyKvKgBtCSHBfgKaH";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const visitorId = cookieStore.get("visitor_id")?.value || "";
    const country = request.headers.get("x-vercel-ip-country") || "";

    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        discounts: [{ promotion_code: ASO_PROMO_CODE }],
        line_items: [{ price: ASO_PRICE_ID, quantity: 1 }],
        subscription_data: {
          metadata: { product: "aso", visitorId, country },
        },
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
        where: { sessionId_type_product: { sessionId: visitorId, type: "stripe_shown", product: "aso" } },
        create: { product: "aso", type: "stripe_shown", visitorId, sessionId: visitorId, country: country || null },
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
