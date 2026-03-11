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

    // Idempotent — returns existing key if already created by webhook
    const licenseKey = await generateAsoLicense(email, customerId);

    return NextResponse.json({ licenseKey, email });
  } catch (err) {
    console.error("[ASO Success] Error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve license" },
      { status: 500 }
    );
  }
}
