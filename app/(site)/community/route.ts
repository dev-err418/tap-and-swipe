import { randomInt, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  COMMUNITY_PRICING_COOKIE,
  COMMUNITY_PRICING_EXPERIMENT,
  COMMUNITY_PRICING_URLS,
  chooseCommunityPricingVariant,
  communityPricingMarker,
  communityPricingVariant,
} from "@/lib/community-pricing-experiment";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const existingVisitorId = request.cookies.get("visitor_id")?.value;
  const visitorId = existingVisitorId ?? randomUUID();
  const sessionId = randomUUID();
  const existingVariant = communityPricingVariant(
    request.cookies.get(COMMUNITY_PRICING_COOKIE)?.value,
  );
  const variant = existingVariant ?? chooseCommunityPricingVariant(randomInt(2));
  const country = request.headers.get("cf-ipcountry") || null;
  const ref = request.nextUrl.searchParams.get("utm_code")
    ?? request.nextUrl.searchParams.get("ref")
    ?? null;
  let referrer: string | null = null;
  const referer = request.headers.get("referer");
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
      currency: communityPricingMarker(variant),
    },
  }).catch((error) => console.error("[community] analytics event failed", error));

  const response = NextResponse.redirect(COMMUNITY_PRICING_URLS[variant], 307);
  const cookieOptions = {
    path: "/",
    maxAge: 31_536_000,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
  if (!existingVisitorId) {
    response.cookies.set("visitor_id", visitorId, cookieOptions);
  }
  response.cookies.set(COMMUNITY_PRICING_COOKIE, variant, {
    ...cookieOptions,
    httpOnly: true,
  });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");
  response.headers.set("X-Experiment", COMMUNITY_PRICING_EXPERIMENT);
  response.headers.set("X-Experiment-Variant", variant);
  return response;
}
