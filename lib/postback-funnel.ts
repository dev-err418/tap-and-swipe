import "server-only";

import type { AppSprintFunnelAnalytics } from "@/lib/appsprint-funnel";

type PostbackMetricRow = {
  visits: number;
  revenue: number;
  postbackCheckouts: number;
  postbackTrials: number;
  postbackPaid: number;
};

type PostbackBreakdownRow = PostbackMetricRow & {
  key: string;
  label: string;
  channel: string;
  channelLabel: string;
  country: string | null;
  referrerHost: string | null;
};

type PostbackAnalytics = {
  generatedAt: string;
  windowDays: number;
  totals: PostbackMetricRow;
  byChannel: PostbackBreakdownRow[];
  byCountry: PostbackBreakdownRow[];
  byReferrer: PostbackBreakdownRow[];
  daily: (PostbackMetricRow & { bucket: string })[];
  interval?: (PostbackMetricRow & { bucket: string })[];
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

export async function getPostbackFunnelAnalytics(period?: string) {
  const baseUrl = (
    process.env.POSTBACK_ANALYTICS_URL ?? "https://postback.sh"
  ).replace(/\/$/, "");
  const secret = process.env.POSTBACK_ANALYTICS_SECRET?.trim();
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
      throw new Error(`Postback analytics returned ${response.status}`);
    }
    return adaptPostbackAnalytics((await response.json()) as PostbackAnalytics);
  } catch (error) {
    const log = process.env.NODE_ENV === "development" ? console.warn : console.error;
    log("tap_and_swipe.postback_funnel_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function adaptPostbackAnalytics(
  analytics: PostbackAnalytics,
): AppSprintFunnelAnalytics {
  const breakdown = (row: PostbackBreakdownRow) => ({
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
    asoCheckouts: row.postbackCheckouts,
    asoTrials: row.postbackTrials,
    asoPaid: row.postbackPaid,
  });

  return {
    generatedAt: analytics.generatedAt,
    windowDays: analytics.windowDays,
    totals: {
      appsprintVisits: 0,
      asoVisits: analytics.totals.visits,
      bookCallClicks: 0,
      bookCallStarted: 0,
      asoCheckouts: analytics.totals.postbackCheckouts,
      asoTrials: analytics.totals.postbackTrials,
      asoPaid: analytics.totals.postbackPaid,
    },
    byChannel: analytics.byChannel.map(breakdown),
    byCountry: analytics.byCountry.map(breakdown),
    byReferrer: analytics.byReferrer.map((row) => ({
      ...breakdown(row),
      conversions: row.postbackTrials + row.postbackPaid,
    })),
    daily: analytics.daily.map((row) => ({
      surface: "aso",
      date: row.bucket.slice(0, 10),
      visits: row.visits,
      revenue: row.revenue,
      bookCallClicks: 0,
      bookCallStarted: 0,
      asoTrials: row.postbackTrials,
      asoPaid: row.postbackPaid,
    })),
    interval: analytics.interval?.map((row) => ({
      surface: "aso",
      bucket: row.bucket,
      visits: row.visits,
      revenue: row.revenue,
      asoTrials: row.postbackTrials,
    })),
    recentConversions: analytics.recentConversions.map((row) => ({
      ...row,
      surface: "aso",
    })),
    heroPreviewExperiment: [],
  };
}
