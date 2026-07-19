import "server-only";

export type AppSprintFunnelSurface = "appsprint" | "aso";

export type AppSprintFunnelBreakdownRow = {
  surface: AppSprintFunnelSurface;
  channel?: string;
  channelLabel?: string;
  country?: string | null;
  referrerHost?: string | null;
  referrerLabel?: string;
  visits: number;
  revenue: number;
  bookCallClicks: number;
  bookCallStarted: number;
  asoCheckouts: number;
  asoTrials: number;
  asoPaid: number;
};

export type AppSprintFunnelAnalytics = {
  generatedAt: string;
  windowDays: number;
  totals: {
    appsprintVisits: number;
    asoVisits: number;
    bookCallClicks: number;
    bookCallStarted: number;
    asoCheckouts: number;
    asoTrials: number;
    asoPaid: number;
  };
  byChannel: (AppSprintFunnelBreakdownRow & {
    channel: string;
    channelLabel: string;
  })[];
  byCountry: (AppSprintFunnelBreakdownRow & { country: string | null })[];
  byReferrer: (AppSprintFunnelBreakdownRow & {
    channel: string;
    channelLabel: string;
    referrerHost: string | null;
    referrerLabel: string;
    conversions: number;
  })[];
  daily: {
    surface: AppSprintFunnelSurface;
    date: string;
    visits: number;
    revenue: number;
    bookCallClicks: number;
    bookCallStarted: number;
    asoTrials: number;
    asoPaid: number;
    asoMaturedTrials: number;
    asoMaturedPaid: number;
  }[];
  interval?: {
    surface: AppSprintFunnelSurface;
    bucket: string;
    visits: number;
    revenue: number;
    asoTrials: number;
  }[];
  recentConversions: {
    id: string;
    occurredAt: string;
    eventType: string;
    surface: AppSprintFunnelSurface;
    channel: string;
    channelLabel: string;
    country: string | null;
    path: string | null;
    referrerHost: string | null;
  }[];
  heroPreviewExperiment: {
    variant: string;
    label: string;
    visitors: number;
    paymentPageViews: number;
    paid: number;
    revenue: number;
  }[];
};

export async function getAppSprintFunnelAnalytics(period?: string) {
  const baseUrl = (
    process.env.APPSPRINT_ANALYTICS_URL ??
    "https://appsprint.app"
  ).replace(/\/$/, "");
  const secret = process.env.APPSPRINT_ANALYTICS_SECRET?.trim();
  const query = period ? `?period=${encodeURIComponent(period)}` : "";

  try {
    const response = await fetch(`${baseUrl}/api/internal/marketing-funnel${query}`, {
      cache: "no-store",
      headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
    });

    if (!response.ok) {
      throw new Error(`AppSprint analytics returned ${response.status}`);
    }

    return (await response.json()) as AppSprintFunnelAnalytics;
  } catch (error) {
    console.error("tap_and_swipe.appsprint_funnel_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
