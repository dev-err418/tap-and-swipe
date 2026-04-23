import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getWhop, WHOP_COMMUNITY_PLAN_ID } from "@/lib/whop";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(`${APP_URL}/api/auth/discord`);
  }

  const user = await prisma.user.findUnique({
    where: { discordId: session.discordId },
    select: { id: true, visitorId: true },
  });

  try {
    const headersList = await headers();
    const country = headersList.get("cf-ipcountry") || "";

    const cookieStore = await cookies();
    const visitorId = cookieStore.get("visitor_id")?.value || "";

    if (user && visitorId && !user.visitorId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { visitorId },
      }).catch(() => {});
    }

    const whop = getWhop();
    const checkout = await whop.checkoutConfigurations.create({
      plan_id: WHOP_COMMUNITY_PLAN_ID,
      redirect_url: "https://tap-and-swipe.com/learn",
      metadata: {
        ...(user && { userId: user.id }),
        discordId: session.discordId,
        visitorId,
        country,
      },
    });

    // Track checkout_shown event
    if (visitorId) {
      await prisma.pageEvent.upsert({
        where: { sessionId_type_product: { sessionId: visitorId, type: "checkout_shown", product: "community" } },
        create: { product: "community", type: "checkout_shown", visitorId, sessionId: visitorId, country: country || null },
        update: {},
      }).catch(() => {});
    }

    const checkoutUrl = checkout.purchase_url.startsWith("http")
      ? checkout.purchase_url
      : `https://whop.com${checkout.purchase_url}`;

    return NextResponse.redirect(checkoutUrl);
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.redirect(`${APP_URL}/community?error=checkout_failed`);
  }
}
