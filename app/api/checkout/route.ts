import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSession, clearSession } from "@/lib/session";
import { getWhop, WHOP_COMMUNITY_PLAN_ID } from "@/lib/whop";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET() {
  // Try Auth.js session first, then legacy Discord session
  const authSession = await auth();
  const discordSession = await getSession();

  let userId: string | null = null;
  let discordId: string | null = null;

  if (authSession?.user?.id) {
    userId = authSession.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { discordId: true },
    });
    discordId = user?.discordId ?? null;
  } else if (discordSession) {
    discordId = discordSession.discordId;
    const user = await prisma.user.findUnique({
      where: { discordId: discordSession.discordId },
      select: { id: true },
    });
    userId = user?.id ?? null;
  }

  if (!userId && !discordId) {
    return NextResponse.redirect(`${APP_URL}/app-sprint-community?error=session_expired`);
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
        ...(userId && { userId }),
        ...(discordId && { discordId }),
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

    // Clear legacy Discord session if it was used
    if (discordSession) {
      await clearSession();
    }

    const checkoutUrl = checkout.purchase_url.startsWith("http")
      ? checkout.purchase_url
      : `https://whop.com${checkout.purchase_url}`;

    return NextResponse.redirect(checkoutUrl);
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.redirect(`${APP_URL}/app-sprint-community?error=checkout_failed`);
  }
}
