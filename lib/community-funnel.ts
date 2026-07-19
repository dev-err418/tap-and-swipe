import "server-only";

import { prisma } from "@/lib/prisma";
import type {
  AppSprintFunnelAnalytics,
  AppSprintFunnelBreakdownRow,
} from "@/lib/appsprint-funnel";

type Period = "day" | "yesterday" | "3days" | "week" | "month" | "all";

type FunnelEvent = {
  id: string;
  type: string;
  visitorId: string;
  sessionId: string;
  country: string | null;
  referrer: string | null;
  ref: string | null;
  revenue: number | null;
  createdAt: Date;
};

type Metrics = {
  visits: number;
  revenue: number;
  checkouts: number;
  paid: number;
};

type Breakdown = Metrics & {
  channel: string;
  channelLabel: string;
  country: string | null;
  referrerHost: string | null;
  referrerLabel?: string;
};

export async function getCommunityFunnelAnalytics(
  period: Period = "week",
): Promise<AppSprintFunnelAnalytics> {
  const { since, before } = periodRange(period);
  const events = await prisma.pageEvent.findMany({
    where: {
      product: "community",
      type: { in: ["page_view", "checkout_shown", "paid", "renewal"] },
      createdAt: {
        ...(since && { gte: since }),
        lt: before,
      },
    },
    select: {
      id: true,
      type: true,
      visitorId: true,
      sessionId: true,
      country: true,
      referrer: true,
      ref: true,
      revenue: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return assembleAnalytics(events, since, before);
}

function assembleAnalytics(
  events: FunnelEvent[],
  requestedSince: Date | null,
  before: Date,
): AppSprintFunnelAnalytics {
  const since = requestedSince ?? events[0]?.createdAt ?? before;
  const windowDays = Math.max(1, Math.ceil((before.getTime() - since.getTime()) / 86_400_000));
  const totals = emptyMetrics();
  const totalVisitors = new Set<string>();
  const channels = new Map<string, Breakdown>();
  const countries = new Map<string, Breakdown>();
  const referrers = new Map<string, Breakdown>();
  const channelVisitors = new Set<string>();
  const countryVisitors = new Set<string>();
  const referrerVisitors = new Set<string>();

  for (const event of events) {
    const channel = eventChannel(event);
    const referrerHost = normalizeHost(event.referrer);
    const metrics = eventMetrics(event);

    if (event.type === "page_view") {
      if (totalVisitors.has(event.visitorId)) metrics.visits = 0;
      else totalVisitors.add(event.visitorId);
    }
    addMetrics(totals, metrics);

    addBreakdown(
      channels,
      channel.key,
      metrics,
      channelVisitors,
      event,
      { channel: channel.key, channelLabel: channel.label, country: null, referrerHost: null },
    );
    addBreakdown(
      countries,
      event.country ?? "unknown",
      metrics,
      countryVisitors,
      event,
      { channel: channel.key, channelLabel: channel.label, country: event.country, referrerHost: null },
    );
    addBreakdown(
      referrers,
      referrerHost ?? "direct",
      metrics,
      referrerVisitors,
      event,
      {
        channel: channel.key,
        channelLabel: channel.label,
        country: null,
        referrerHost,
        referrerLabel: referrerHost ?? "Direct",
      },
    );
  }

  const daily = buildTimeRows(events, since, before, 24).map((row) => ({
    surface: "aso" as const,
    date: row.bucket.slice(0, 10),
    visits: row.visits,
    revenue: row.revenue,
    bookCallClicks: 0,
    bookCallStarted: 0,
    asoTrials: 0,
    asoPaid: row.paid,
  }));
  const durationMs = before.getTime() - since.getTime();
  const intervalHours = durationMs <= 3 * 86_400_000 ? 1 : durationMs <= 7 * 86_400_000 ? 4 : null;
  const interval = intervalHours
    ? buildTimeRows(events, since, before, intervalHours).map((row) => ({
        surface: "aso" as const,
        bucket: row.bucket,
        visits: row.visits,
        revenue: row.revenue,
        asoTrials: 0,
      }))
    : undefined;
  const toBreakdown = (row: Breakdown): AppSprintFunnelBreakdownRow => ({
    surface: "aso",
    channel: row.channel,
    channelLabel: row.channelLabel,
    country: row.country,
    referrerHost: row.referrerHost,
    referrerLabel: row.referrerLabel,
    visits: row.visits,
    revenue: row.revenue,
    bookCallClicks: 0,
    bookCallStarted: 0,
    asoCheckouts: row.checkouts,
    asoTrials: 0,
    asoPaid: row.paid,
  });
  const sorted = (rows: Map<string, Breakdown>) =>
    [...rows.values()].sort((a, b) => b.visits - a.visits || b.revenue - a.revenue);

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    totals: {
      appsprintVisits: 0,
      asoVisits: totals.visits,
      bookCallClicks: 0,
      bookCallStarted: 0,
      asoCheckouts: totals.checkouts,
      asoTrials: 0,
      asoPaid: totals.paid,
    },
    byChannel: sorted(channels).map((row) => ({
      ...toBreakdown(row),
      channel: row.channel,
      channelLabel: row.channelLabel,
    })),
    byCountry: sorted(countries).map((row) => ({ ...toBreakdown(row), country: row.country })),
    byReferrer: sorted(referrers).map((row) => ({
      ...toBreakdown(row),
      channel: row.channel,
      channelLabel: row.channelLabel,
      referrerHost: row.referrerHost,
      referrerLabel: row.referrerLabel ?? row.referrerHost ?? "Direct",
      conversions: row.paid,
    })),
    daily,
    ...(interval && { interval }),
    recentConversions: events
      .filter((event) => event.type === "checkout_shown" || event.revenue !== null)
      .slice(-50)
      .reverse()
      .map((event) => {
        const channel = eventChannel(event);
        return {
          id: event.id,
          occurredAt: event.createdAt.toISOString(),
          eventType:
            event.type === "checkout_shown"
              ? "community_checkout_started"
              : event.type === "renewal"
                ? "community_renewal"
                : "community_paid",
          surface: "aso" as const,
          channel: channel.key,
          channelLabel: channel.label,
          country: event.country,
          path: "/community",
          referrerHost: normalizeHost(event.referrer),
        };
      }),
    heroPreviewExperiment: [],
  };
}

function buildTimeRows(
  events: FunnelEvent[],
  since: Date,
  before: Date,
  hours: number,
) {
  const bucketMs = hours * 3_600_000;
  const firstBucket = hours === 24
    ? Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate())
    : since.getTime();
  const rows = new Map<number, Metrics>();
  const visitorKeys = new Set<string>();

  for (let value = firstBucket; value < before.getTime(); value += bucketMs) {
    rows.set(value, emptyMetrics());
  }
  for (const event of events) {
    const index = Math.floor((event.createdAt.getTime() - firstBucket) / bucketMs);
    const bucket = firstBucket + index * bucketMs;
    const row = rows.get(bucket);
    if (!row) continue;
    const metrics = eventMetrics(event);
    if (event.type === "page_view") {
      const key = `${bucket}:${event.visitorId}`;
      if (visitorKeys.has(key)) metrics.visits = 0;
      else visitorKeys.add(key);
    }
    addMetrics(row, metrics);
  }

  return [...rows.entries()].map(([bucket, metrics]) => ({
    bucket: new Date(bucket).toISOString(),
    ...metrics,
  }));
}

function addBreakdown(
  map: Map<string, Breakdown>,
  key: string,
  sourceMetrics: Metrics,
  visitors: Set<string>,
  event: FunnelEvent,
  defaults: Omit<Breakdown, keyof Metrics>,
) {
  const metrics = { ...sourceMetrics };
  if (event.type === "page_view") {
    const visitorKey = `${key}:${event.visitorId}`;
    if (visitors.has(visitorKey)) metrics.visits = 0;
    else visitors.add(visitorKey);
  }
  const row = map.get(key) ?? { ...defaults, ...emptyMetrics() };
  addMetrics(row, metrics);
  map.set(key, row);
}

function eventMetrics(event: FunnelEvent): Metrics {
  const isRevenue = event.type === "paid" || event.type === "renewal";
  return {
    visits: event.type === "page_view" ? 1 : 0,
    revenue: isRevenue ? (event.revenue ?? 0) / 100 : 0,
    checkouts: event.type === "checkout_shown" ? 1 : 0,
    paid: event.type === "paid" && event.revenue !== null ? 1 : 0,
  };
}

function emptyMetrics(): Metrics {
  return { visits: 0, revenue: 0, checkouts: 0, paid: 0 };
}

function addMetrics(target: Metrics, source: Metrics) {
  target.visits += source.visits;
  target.revenue += source.revenue;
  target.checkouts += source.checkouts;
  target.paid += source.paid;
}

function eventChannel(event: Pick<FunnelEvent, "ref" | "referrer">) {
  const ref = normalize(event.ref)?.toLowerCase();
  if (ref?.includes("quiz")) return { key: "quiz", label: "Quiz" };
  const source = ref ?? normalizeHost(event.referrer) ?? "direct";
  if (source === "direct") return { key: "direct", label: "Direct" };
  if (source.includes("youtube") || source === "youtu.be") return { key: "youtube", label: "YouTube" };
  if (source.includes("google")) return { key: "google", label: "Google" };
  if (source.includes("twitter") || source === "x" || source.includes("x.com") || source === "t.co") return { key: "x", label: "X" };
  if (source.includes("linkedin") || source === "lnkd.in") return { key: "linkedin", label: "LinkedIn" };
  if (source.includes("reddit")) return { key: "reddit", label: "Reddit" };
  if (source.includes("tiktok")) return { key: "tiktok", label: "TikTok" };
  if (source.includes("instagram")) return { key: "instagram", label: "Instagram" };
  if (source.includes("facebook")) return { key: "facebook", label: "Facebook" };
  if (source.includes("email") || source.includes("newsletter")) return { key: "email", label: "Email" };
  return { key: source, label: source };
}

function normalizeHost(value: string | null | undefined) {
  const normalized = normalize(value);
  if (!normalized) return null;
  try {
    return new URL(normalized.includes("://") ? normalized : `https://${normalized}`)
      .hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return normalized.toLowerCase().replace(/^www\./, "");
  }
}

function normalize(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function periodRange(period: Period) {
  const before = new Date();
  const today = new Date(Date.UTC(before.getUTCFullYear(), before.getUTCMonth(), before.getUTCDate()));
  if (period === "day") return { since: today, before };
  if (period === "yesterday") {
    const since = new Date(today);
    since.setUTCDate(since.getUTCDate() - 1);
    return { since, before: today };
  }
  if (period === "3days") return { since: new Date(before.getTime() - 3 * 86_400_000), before };
  if (period === "week") return { since: new Date(before.getTime() - 7 * 86_400_000), before };
  if (period === "month") return { since: new Date(before.getTime() - 30 * 86_400_000), before };
  return { since: null, before };
}
