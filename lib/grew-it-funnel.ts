import "server-only";

import type { AppSprintFunnelAnalytics } from "@/lib/appsprint-funnel";

type GrewItMetricRow = {
  visits: number;
  revenue: number;
  grewitSignups: number;
  grewitListed: number;
};

type GrewItBreakdownRow = GrewItMetricRow & {
  key: string;
  label: string;
  channel: string;
  channelLabel: string;
  country: string | null;
  referrerHost: string | null;
};

type GrewItAnalytics = {
  generatedAt: string;
  windowDays: number;
  totals: GrewItMetricRow;
  byChannel: GrewItBreakdownRow[];
  byCountry: GrewItBreakdownRow[];
  byReferrer: GrewItBreakdownRow[];
  daily: (GrewItMetricRow & { bucket: string })[];
  interval?: (GrewItMetricRow & { bucket: string })[];
  recentConversions: {
    id: string;
    occurredAt: string;
    eventType: string;
    channel: string;
    channelLabel: string;
    country: string | null;
    path: string | null;
    referrerHost: string | null;
  }[];
};

export async function getGrewItFunnelAnalytics(period?: string) {
  const baseUrl = (
    process.env.GREW_IT_ANALYTICS_URL ?? "https://grewit.app"
  ).replace(/\/$/, "");
  const secret = process.env.GREW_IT_ANALYTICS_SECRET?.trim();
  const query = period ? `?period=${encodeURIComponent(period)}` : "";

  try {
    const response = await fetch(
      `${baseUrl}/api/internal/marketing-funnel${query}`,
      {
        cache: "no-store",
        headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
      },
    );
    if (!response.ok) {
      throw new Error(`Grew It analytics returned ${response.status}`);
    }
    return adaptGrewItAnalytics((await response.json()) as GrewItAnalytics);
  } catch (error) {
    const log =
      process.env.NODE_ENV === "development" ? console.warn : console.error;
    log("tap_and_swipe.grew_it_funnel_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function adaptGrewItAnalytics(
  analytics: GrewItAnalytics,
): AppSprintFunnelAnalytics {
  const breakdown = (row: GrewItBreakdownRow) => ({
    surface: "aso" as const,
    channel: row.channel,
    channelLabel: row.channelLabel,
    country: row.country,
    referrerHost: row.referrerHost,
    referrerLabel: row.label,
    visits: row.visits,
    revenue: row.revenue,
    bookCallClicks: 0,
    bookCallStarted: 0,
    asoCheckouts: row.grewitSignups,
    asoTrials: 0,
    asoPaid: row.grewitListed,
  });

  return {
    generatedAt: analytics.generatedAt,
    windowDays: analytics.windowDays,
    totals: {
      appsprintVisits: 0,
      asoVisits: analytics.totals.visits,
      bookCallClicks: 0,
      bookCallStarted: 0,
      asoCheckouts: analytics.totals.grewitSignups,
      asoTrials: 0,
      asoPaid: analytics.totals.grewitListed,
    },
    byChannel: analytics.byChannel.map(breakdown),
    byCountry: analytics.byCountry.map(breakdown),
    byReferrer: analytics.byReferrer.map((row) => ({
      ...breakdown(row),
      conversions: row.grewitListed,
    })),
    daily: analytics.daily.map((row) => ({
      surface: "aso",
      date: row.bucket.slice(0, 10),
      visits: row.visits,
      revenue: row.revenue,
      bookCallClicks: 0,
      bookCallStarted: 0,
      asoTrials: 0,
      asoPaid: row.grewitListed,
    })),
    interval: analytics.interval?.map((row) => ({
      surface: "aso",
      bucket: row.bucket,
      visits: row.visits,
      revenue: row.revenue,
      asoTrials: 0,
    })),
    recentConversions: analytics.recentConversions.map((row) => ({
      ...row,
      surface: "aso" as const,
    })),
    heroPreviewExperiment: [],
  };
}
