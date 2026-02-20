import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { paddle } from "@/lib/paddle";
import { getSession, clearSession } from "@/lib/session";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(`${APP_URL}/app-sprint?error=session_expired`);
  }

  try {
    // Create a Paddle transaction with hosted checkout
    const transaction = await paddle.transactions.create({
      items: [
        {
          priceId: process.env.PADDLE_PRICE_ID!,
          quantity: 1,
        },
      ],
      customData: {
        discordId: session.discordId,
      },
      checkout: {
        url: `${APP_URL}/app-sprint?status=success`,
      },
    });

    // Read DataFast cookies for attribution
    const cookieStore = await cookies();
    const datafastVisitorId = cookieStore.get("datafast_visitor_id")?.value;

    // Fire DataFast goal for Paddle checkout shown
    if (datafastVisitorId && process.env.DATAFAST_API_KEY) {
      fetch("https://datafa.st/api/v1/goals", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DATAFAST_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          datafast_visitor_id: datafastVisitorId,
          name: "paddle_checkout_shown",
        }),
      }).catch(() => {}); // fire-and-forget
    }

    await clearSession();

    const checkoutUrl = transaction.checkout?.url;
    if (!checkoutUrl) {
      console.error("Paddle transaction created but no checkout URL returned");
      return NextResponse.redirect(
        `${APP_URL}/app-sprint?error=checkout_failed`
      );
    }

    return NextResponse.redirect(checkoutUrl);
  } catch (err) {
    console.error("Paddle checkout error:", err);
    return NextResponse.redirect(
      `${APP_URL}/app-sprint?error=checkout_failed`
    );
  }
}
