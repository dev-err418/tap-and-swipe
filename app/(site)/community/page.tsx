import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getWhop, WHOP_COMMUNITY_PLAN_ID } from "@/lib/whop";

export const dynamic = "force-dynamic";

export default async function CommunityRedirect({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; utm_code?: string }>;
}) {
  const [h, c, params] = await Promise.all([headers(), cookies(), searchParams]);
  const existingVisitorId = c.get("visitor_id")?.value;
  const visitorId = existingVisitorId ?? randomUUID();
  const sessionId = randomUUID();
  const country = h.get("cf-ipcountry") || null;
  const ref = params.utm_code ?? params.ref ?? null;
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const checkoutRedirectBase = configuredAppUrl.startsWith("https://")
    ? configuredAppUrl.replace(/\/$/, "")
    : "https://tap-and-swipe.com";

  let referrer: string | null = null;
  const referer = h.get("referer");
  if (referer) {
    try {
      referrer = new URL(referer).hostname.replace(/^www\./, "") || null;
    } catch {}
  }

  const checkout = await getWhop().checkoutConfigurations.create({
    plan_id: WHOP_COMMUNITY_PLAN_ID,
    redirect_url: `${checkoutRedirectBase}/join-discord`,
    metadata: {
      visitorId,
      country: country ?? "",
      tier: "full",
      ...(ref && { ref }),
      ...(referrer && { referrer }),
    },
  });
  const checkoutUrl = checkout.purchase_url.startsWith("http")
    ? checkout.purchase_url
    : `https://whop.com${checkout.purchase_url}`;

  await prisma.pageEvent.create({
    data: {
      product: "community",
      type: "page_view",
      visitorId,
      sessionId,
      country,
      referrer,
      ref,
    },
  }).catch((error) => console.error("[community] analytics event failed", error));

  redirect(checkoutUrl);
}
