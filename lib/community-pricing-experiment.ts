export const COMMUNITY_PRICING_EXPERIMENT = "community_currency_v1";
export const COMMUNITY_PRICING_COOKIE = "community_price_variant";

export const COMMUNITY_PRICING_VARIANTS = ["usd", "eur"] as const;

export type CommunityPricingVariant = (typeof COMMUNITY_PRICING_VARIANTS)[number];

export const COMMUNITY_PRICING_URLS: Record<CommunityPricingVariant, string> = {
  usd: "https://whop.com/appsprint-community/products/app-sprint-access/",
  eur: "https://whop.com/appsprint-community/products/app-sprint-access-eur/",
};

const PLAN_VARIANTS: Record<string, CommunityPricingVariant> = {
  plan_nYipX56xPU7wG: "usd",
  plan_R17LIUVVasTe2: "usd",
  plan_TST74YEnFAx5Q: "eur",
  plan_aJQtRRtuScfXU: "eur",
};

const EUR_PLAN_TIERS: Record<string, "starter" | "full"> = {
  plan_TST74YEnFAx5Q: "starter",
  plan_aJQtRRtuScfXU: "full",
};

export function communityPricingVariant(value: string | null | undefined) {
  return value === "usd" || value === "eur" ? value : null;
}

export function chooseCommunityPricingVariant(randomBit: number): CommunityPricingVariant {
  return randomBit === 0 ? "usd" : "eur";
}

export function communityPricingVariantForPlan(planId: string | null | undefined) {
  return planId ? PLAN_VARIANTS[planId] ?? null : null;
}

export function communityEuroTierForPlan(planId: string | null | undefined) {
  return planId ? EUR_PLAN_TIERS[planId] ?? null : null;
}

export function communityPricingMarker(variant: CommunityPricingVariant) {
  return `${COMMUNITY_PRICING_EXPERIMENT}:${variant}`;
}

export function communityPricingVariantFromMarker(value: string | null | undefined) {
  if (!value?.startsWith(`${COMMUNITY_PRICING_EXPERIMENT}:`)) return null;
  return communityPricingVariant(value.slice(COMMUNITY_PRICING_EXPERIMENT.length + 1));
}

type CommunityPricingEvent = {
  type: string;
  visitorId: string;
  revenue: number | null;
  currency: string | null;
};

export function assembleCommunityPricingExperiment(events: CommunityPricingEvent[]) {
  const rows = new Map(COMMUNITY_PRICING_VARIANTS.map((variant) => [
    variant,
    {
      variant,
      label: variant === "usd" ? "USD pricing ($99 / $149)" : "EUR pricing (€99 / €149)",
      visitors: 0,
      paymentPageViews: 0,
      trials: 0,
      paid: 0,
      revenue: 0,
      currency: variant.toUpperCase(),
    },
  ]));
  const assignedVisitors = new Map<string, CommunityPricingVariant>();
  const countedVisitors = new Set<string>();

  for (const event of events) {
    const markedVariant = communityPricingVariantFromMarker(event.currency);
    if (event.type === "page_view" && markedVariant) {
      assignedVisitors.set(event.visitorId, markedVariant);
    }
    const variant = markedVariant ?? assignedVisitors.get(event.visitorId);
    if (!variant) continue;
    const row = rows.get(variant)!;

    if (event.type === "page_view") {
      const key = `${variant}:${event.visitorId}`;
      if (!countedVisitors.has(key)) {
        countedVisitors.add(key);
        row.visitors += 1;
      }
    } else if (event.type === "checkout_shown") {
      row.paymentPageViews += 1;
    } else if (event.type === "paid") {
      row.paid += 1;
      row.revenue += (event.revenue ?? 0) / 100;
    }
  }

  return COMMUNITY_PRICING_VARIANTS.map((variant) => rows.get(variant)!);
}
