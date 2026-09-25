"use server";

import type { AppSprintFunnelAnalytics } from "@/lib/appsprint-funnel";
import { getGrewItFunnelAnalytics } from "@/lib/grew-it-funnel";
import { getPostbackFunnelAnalytics } from "@/lib/postback-funnel";

type Period = "day" | "yesterday" | "3days" | "week" | "month" | "all";
type WebsiteSite = "postback" | "grewit";

export type DeadProjectCard = {
  site: WebsiteSite;
  domain: string;
  metrics: { visitors: number; revenue_cents: number };
  trend: { bucket: string; visitors: number; revenue: number }[];
  activeTests: number;
};

export async function loadDeadProjectCards(period: Period): Promise<DeadProjectCard[]> {
  const [postbackAnalytics, grewItAnalytics] = await Promise.all([
    getPostbackFunnelAnalytics(period),
    getGrewItFunnelAnalytics(period),
  ]);
  return [
    postbackAnalytics ? toCard("postback", "postback.sh", postbackAnalytics) : null,
    grewItAnalytics ? toCard("grewit", "grewit.app", grewItAnalytics) : null,
  ].filter((card) => card !== null);
}

function toCard(site: WebsiteSite, domain: string, analytics: AppSprintFunnelAnalytics): DeadProjectCard {
  const daily = analytics.daily.filter((row) => row.surface === "aso");
  const interval = analytics.interval?.filter((row) => row.surface === "aso") ?? [];
  const trend = interval.length > 0
    ? interval.map((row) => ({ bucket: row.bucket, visitors: row.visits, revenue: row.revenue }))
    : daily.map((row) => ({ bucket: `${row.date}T00:00:00Z`, visitors: row.visits, revenue: row.revenue }));
  return {
    site,
    domain,
    metrics: {
      visitors: analytics.totals.asoVisits,
      revenue_cents: daily.reduce((sum, row) => sum + row.revenue, 0) * 100,
    },
    trend,
    activeTests: [
      analytics.pricingExperiment,
      analytics.heroPreviewExperiment,
      analytics.trialExperiment,
      analytics.onboardingExperiment,
    ].filter((rows) => new Set(rows?.map((row) => row.variant) ?? []).size > 1).length,
  };
}
