import { NextResponse } from "next/server";
import { paddle } from "@/lib/paddle";
import { getSession, clearSession } from "@/lib/session";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(`${APP_URL}/app-sprint-community?error=session_expired`);
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
        url: `${APP_URL}/app-sprint-community?status=success`,
      },
    });

    await clearSession();

    const checkoutUrl = transaction.checkout?.url;
    if (!checkoutUrl) {
      console.error("Paddle transaction created but no checkout URL returned");
      return NextResponse.redirect(
        `${APP_URL}/app-sprint-community?error=checkout_failed`
      );
    }

    return NextResponse.redirect(checkoutUrl);
  } catch (err) {
    console.error("Paddle checkout error:", err);
    return NextResponse.redirect(
      `${APP_URL}/app-sprint-community?error=checkout_failed`
    );
  }
}
