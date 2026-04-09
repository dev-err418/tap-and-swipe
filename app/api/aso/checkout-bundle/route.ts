import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession, clearSession } from "@/lib/session";
import { getWhop, WHOP_COMMUNITY_PLAN_ID } from "@/lib/whop";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(`${APP_URL}/aso?error=session_expired`);
  }

  try {
    const headersList = await headers();
    const country = headersList.get("cf-ipcountry") || "";

    const cookieStore = await cookies();
    const visitorId = cookieStore.get("visitor_id")?.value || "";

    const whop = getWhop();
    const checkout = await whop.checkoutConfigurations.create({
      plan_id: WHOP_COMMUNITY_PLAN_ID,
      redirect_url: `${APP_URL}/app-sprint-community?status=success`,
      metadata: {
        discordId: session.discordId,
        visitorId,
        country,
        product: "bundle-aso",
      },
    });

    // Track checkout_shown event
    if (visitorId) {
      await prisma.pageEvent.upsert({
        where: { sessionId_type_product: { sessionId: visitorId, type: "checkout_shown", product: "bundle-aso" } },
        create: { product: "bundle-aso", type: "checkout_shown", visitorId, sessionId: visitorId, country: country || null },
        update: {},
      }).catch(() => {});
    }

    await clearSession();

    const checkoutUrl = checkout.purchase_url.startsWith("http")
      ? checkout.purchase_url
      : `https://whop.com${checkout.purchase_url}`;

    return NextResponse.redirect(checkoutUrl);
  } catch (err) {
    console.error("[ASO Bundle Checkout] Error:", err);
    return NextResponse.redirect(`${APP_URL}/aso?error=checkout_failed`);
  }
}
