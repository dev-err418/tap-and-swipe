import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { generateAsoLicense } from "@/lib/aso-db";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing session_id" },
      { status: 400 }
    );
  }

  try {
    // Dev bypass — test the UI without a real Stripe session
    if (process.env.NODE_ENV === "development" && sessionId === "test") {
      return NextResponse.json({
        licenseKey: "ASO-TEST-ABCD-1234-EFGH",
        email: "test@example.com",
        isBundle: false,
        isYearlyPro: false,
      });
    }
    if (process.env.NODE_ENV === "development" && sessionId === "test-bundle") {
      return NextResponse.json({
        licenseKey: "ASO-TEST-ABCD-1234-EFGH",
        email: "test@example.com",
        isBundle: true,
        isYearlyPro: false,
      });
    }
    if (process.env.NODE_ENV === "development" && sessionId === "test-yearly-pro") {
      return NextResponse.json({
        licenseKey: "ASO-TEST-ABCD-1234-EFGH",
        email: "test@example.com",
        isBundle: false,
        isYearlyPro: true,
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 402 }
      );
    }

    const customerId = session.customer as string;
    const email = session.customer_details?.email;

    if (!customerId || !email) {
      return NextResponse.json(
        { error: "Missing customer data" },
        { status: 400 }
      );
    }

    // Check subscription metadata
    let isBundle = false;
    let isYearlyPro = false;
    let plan: "solo" | "pro" = "pro";
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      const product = subscription.metadata.product || "";
      const interval = subscription.metadata.interval || "";
      isBundle = product.startsWith("bundle-");
      isYearlyPro = product === "aso-pro" && interval === "year";
      plan = product === "aso-solo" ? "solo" : "pro";
    }

    // Idempotent — returns existing key if already created by webhook
    const { key: licenseKey } = await generateAsoLicense(email, customerId, plan);

    return NextResponse.json({ licenseKey, email, isBundle, isYearlyPro });
  } catch (err) {
    console.error("[ASO Success] Error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve license" },
      { status: 500 }
    );
  }
}
