import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const WHOP_COMMUNITY_URL = "https://whop.com/appsprint-community/products/app-sprint-access/";

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
  let referrer: string | null = null;
  const referer = h.get("referer");
  if (referer) {
    try {
      referrer = new URL(referer).hostname.replace(/^www\./, "") || null;
    } catch {}
  }

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

  redirect(WHOP_COMMUNITY_URL);
}
