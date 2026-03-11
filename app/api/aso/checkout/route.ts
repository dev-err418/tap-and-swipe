import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const ASO_PRICE_ID = process.env.ASO_PRICE_ID || "price_1T9ldIDGyKvKgBtCf9rafpe7";
const ASO_PROMO_CODE = process.env.ASO_PROMO_CODE || "promo_1T9lgHDGyKvKgBtCSHBfgKaH";

export async function POST() {
  try {
    const checkoutSession = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        discounts: [{ promotion_code: ASO_PROMO_CODE }],
        line_items: [{ price: ASO_PRICE_ID, quantity: 1 }],
        subscription_data: {
          metadata: { product: "aso" },
        },
        managed_payments: { enabled: true },
        success_url: `${APP_URL}/aso/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${APP_URL}/aso?status=canceled`,
      } as any,
      {
        apiVersion: "2026-03-04.preview" as any,
      }
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[ASO Checkout] Error:", err);
    return NextResponse.json(
      { error: "Checkout failed" },
      { status: 500 }
    );
  }
}
