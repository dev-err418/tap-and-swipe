import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  getAsoWhop,
  WHOP_ASO_PRO_MONTHLY_PLAN_ID,
  WHOP_ASO_PRO_YEARLY_PLAN_ID,
  WHOP_ASO_SOLO_MONTHLY_PLAN_ID,
  WHOP_ASO_SOLO_YEARLY_PLAN_ID,
} from "@/lib/whop";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.WEB_APP_URL ??
  "https://tap-and-swipe.com";

const PLAN_MAP: Record<string, string> = {
  "solo-month": WHOP_ASO_SOLO_MONTHLY_PLAN_ID,
  "solo-year": WHOP_ASO_SOLO_YEARLY_PLAN_ID,
  "pro-month": WHOP_ASO_PRO_MONTHLY_PLAN_ID,
  "pro-year": WHOP_ASO_PRO_YEARLY_PLAN_ID,
};

export async function POST(request: NextRequest) {
  try {
    const { plan, interval } = (await request.json()) as {
      plan: string;
      interval: string;
    };

    const planId = PLAN_MAP[`${plan}-${interval}`];
    if (!planId) {
      return NextResponse.json(
        { error: "Invalid plan or interval" },
        { status: 400 },
      );
    }

    const product = plan === "solo" ? "aso-solo" : "aso-pro";
    const cookieStore = await cookies();
    const visitorId = cookieStore.get("visitor_id")?.value || "";
    const country = request.headers.get("cf-ipcountry") || "";

    const whop = getAsoWhop();
    const checkout = await whop.checkoutConfigurations.create({
      plan_id: planId,
      redirect_url: `${APP_URL}/aso/success`,
      metadata: {
        product,
        interval,
        visitorId,
        country,
      },
    });

    if (visitorId) {
      await prisma.pageEvent
        .upsert({
          where: {
            sessionId_type_product: {
              sessionId: visitorId,
              type: "checkout_shown",
              product: "aso",
            },
          },
          create: {
            product: "aso",
            type: "checkout_shown",
            visitorId,
            sessionId: visitorId,
            country: country || null,
          },
          update: {},
        })
        .catch(() => {});
    }

    const checkoutUrl = checkout.purchase_url.startsWith("http")
      ? checkout.purchase_url
      : `https://whop.com${checkout.purchase_url}`;

    return NextResponse.json({ url: checkoutUrl });
  } catch (err) {
    console.error("[ASO Checkout] Error:", err);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
