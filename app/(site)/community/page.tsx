import { headers, cookies } from "next/headers";
import { permanentRedirect } from "next/navigation";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

const WHOP_URL = "https://whop.com/appsprint-community/app-sprint-access/";

export const dynamic = "force-dynamic";

export default async function CommunityRedirect({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const [h, c, params] = await Promise.all([headers(), cookies(), searchParams]);

  let referrer: string | null = null;
  const referer = h.get("referer");
  if (referer) {
    try {
      referrer = new URL(referer).hostname.replace(/^www\./, "") || null;
    } catch {}
  }

  await prisma.pageEvent
    .create({
      data: {
        product: "community",
        type: "page_view",
        visitorId: c.get("visitor_id")?.value ?? randomUUID(),
        sessionId: randomUUID(),
        country: h.get("cf-ipcountry") || null,
        referrer,
        ref: params.ref ?? null,
      },
    })
    .catch(() => {});

  permanentRedirect(WHOP_URL);
}
