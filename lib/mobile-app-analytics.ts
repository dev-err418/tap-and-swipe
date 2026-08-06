import "server-only";

type Period = "day" | "yesterday" | "3days" | "week" | "month" | "all";

export type MobileAppTrendPoint = {
  bucket: Date;
  downloads: number;
  revenue: number;
};

export type MobileAppAnalytics = {
  id: "poky" | "versy";
  name: string;
  iconUrl: string;
  downloads: number;
  revenueCents: number;
  trend: MobileAppTrendPoint[];
};

const SUPERWALL_ORGANIZATION_ID = 16256;
const POKY_APPLICATION_ID = 49771;
const VERSY_SUPERWALL_ORGANIZATION_ID = 25476;
const VERSY_SUPERWALL_APPLICATION_ID = 51393;
const ALL_TIME_START = new Date("2024-01-01T00:00:00.000Z");

const POKY_ICON_URL =
  "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/5e/46/3f/5e463fde-45e6-7fdc-ce5a-bb5b73af405d/AppIcon-0-0-1x_U007ephone-0-1-sRGB-85-220.png/512x512bb.jpg";
const VERSY_ICON_URL =
  "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/a6/20/46/a6204617-8071-fad1-c8b2-fb6dc8ea300b/AppIcon-0-0-1x_U007ephone-0-1-85-220.png/512x512bb.jpg";

export async function getMobileAppAnalytics(period: Period) {
  const results = await Promise.allSettled([
    getPokyAnalytics(period),
    getVersyAnalytics(period),
  ]);

  return results.flatMap((result) => {
    if (result.status === "fulfilled") return [result.value];
    const log = process.env.NODE_ENV === "development" ? console.warn : console.error;
    log("tap_and_swipe.mobile_app_analytics_failed", {
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
    return [];
  });
}

async function getPokyAnalytics(period: Period): Promise<MobileAppAnalytics> {
  const apiKey = process.env.SUPERWALL_POKY_API_KEY?.trim();
  if (!apiKey) throw new Error("SUPERWALL_POKY_API_KEY is not configured");

  return getSuperwallAppAnalytics(period, {
    id: "poky",
    name: "Poky",
    iconUrl: POKY_ICON_URL,
    organizationId: SUPERWALL_ORGANIZATION_ID,
    applicationId: POKY_APPLICATION_ID,
    apiKey,
  });
}

async function getVersyAnalytics(period: Period): Promise<MobileAppAnalytics> {
  const apiKey = process.env.SUPERWALL_VERSY_API_KEY?.trim();
  if (!apiKey) throw new Error("SUPERWALL_VERSY_API_KEY is not configured");

  return getSuperwallAppAnalytics(period, {
    id: "versy",
    name: "Versy",
    iconUrl: VERSY_ICON_URL,
    organizationId: VERSY_SUPERWALL_ORGANIZATION_ID,
    applicationId: VERSY_SUPERWALL_APPLICATION_ID,
    apiKey,
  });
}

type SuperwallAppConfig = {
  id: MobileAppAnalytics["id"];
  name: string;
  iconUrl: string;
  organizationId: number;
  applicationId: number;
  apiKey: string;
};

async function getSuperwallAppAnalytics(
  period: Period,
  app: SuperwallAppConfig,
): Promise<MobileAppAnalytics> {
  const { since, before } = periodRange(period);
  const bucketExpression = superwallBucketExpression(period);
  const start = clickhouseDate(since);
  const end = clickhouseDate(before);

  const downloadsQuery = `
    SELECT bucket, sum(hourly_downloads) AS downloads
    FROM (
      SELECT ${bucketExpression} AS bucket, ts, uniqMerge(count) AS hourly_downloads
      FROM sw.events_hr_agg
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND name = 'first_seen'
        AND ts >= toDateTime64('${start}', 6, 'UTC')
        AND ts < toDateTime64('${end}', 6, 'UTC')
        AND ts < now()
      GROUP BY bucket, ts
    )
    GROUP BY bucket
    ORDER BY bucket
    FORMAT JSON
  `;
  const revenueQuery = `
    SELECT bucket, round(sum(net_proceeds), 2) AS revenue
    FROM (
      SELECT ${bucketExpression} AS bucket, name, originalTransactionId, transactionId,
        if(
          argMax(isRefund, attributionTs) = 1,
          -abs(toFloat64(argMax(proceeds, attributionTs))),
          toFloat64(argMax(proceeds, attributionTs))
        ) AS net_proceeds
      FROM open_revenue.attributed_events_by_ts_rep FINAL
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND source = 'integration'
        AND name IN ('initial_purchase', 'renewal', 'non_renewing_purchase')
        AND isFamilyShare = 0
        AND proceeds IS NOT NULL
        AND ts >= toDateTime64('${start}', 6, 'UTC')
        AND ts < toDateTime64('${end}', 6, 'UTC')
        AND ts < now()
      GROUP BY bucket, name, originalTransactionId, transactionId
    )
    GROUP BY bucket
    ORDER BY bucket
    FORMAT JSON
  `;

  const [downloadRows, revenueRows] = await Promise.all([
    querySuperwall<{ bucket: string; downloads: string | number }>(
      downloadsQuery,
      app.organizationId,
      app.apiKey,
    ),
    querySuperwall<{ bucket: string; revenue: string | number | null }>(
      revenueQuery,
      app.organizationId,
      app.apiKey,
    ),
  ]);
  const trend = mergeTrend(
    downloadRows.map((row) => ({ bucket: parseClickhouseDate(row.bucket), downloads: Number(row.downloads) })),
    revenueRows.map((row) => ({ bucket: parseClickhouseDate(row.bucket), revenue: Number(row.revenue ?? 0) })),
  );

  return {
    id: app.id,
    name: app.name,
    iconUrl: app.iconUrl,
    downloads: trend.reduce((sum, point) => sum + point.downloads, 0),
    revenueCents: Math.round(trend.reduce((sum, point) => sum + point.revenue, 0) * 100),
    trend,
  };
}

async function querySuperwall<T>(
  sql: string,
  organizationId: number,
  apiKey: string,
): Promise<T[]> {
  const url = `https://api.superwall.com/v2/organizations/${organizationId}/query`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: sql,
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`Superwall query returned ${response.status}`);
      const parsed = JSON.parse(body) as { data?: T[] };
      return parsed.data ?? [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("Superwall query failed");
}

function mergeTrend(
  downloads: { bucket: Date; downloads: number }[],
  revenue: { bucket: Date; revenue: number }[],
): MobileAppTrendPoint[] {
  const points = new Map<number, MobileAppTrendPoint>();
  for (const row of downloads) {
    points.set(row.bucket.getTime(), { bucket: row.bucket, downloads: row.downloads, revenue: 0 });
  }
  for (const row of revenue) {
    const timestamp = row.bucket.getTime();
    const point = points.get(timestamp) ?? { bucket: row.bucket, downloads: 0, revenue: 0 };
    point.revenue += row.revenue;
    points.set(timestamp, point);
  }
  return [...points.values()].sort((a, b) => a.bucket.getTime() - b.bucket.getTime());
}

function periodRange(period: Period) {
  const before = new Date();
  const today = new Date(Date.UTC(before.getUTCFullYear(), before.getUTCMonth(), before.getUTCDate()));
  if (period === "day") return { since: today, before };
  if (period === "yesterday") return { since: new Date(today.getTime() - 86_400_000), before: today };
  if (period === "3days") return { since: new Date(before.getTime() - 3 * 86_400_000), before };
  if (period === "week") return { since: new Date(before.getTime() - 7 * 86_400_000), before };
  if (period === "month") return { since: new Date(before.getTime() - 30 * 86_400_000), before };
  return { since: ALL_TIME_START, before };
}

function superwallBucketExpression(period: Period) {
  if (period === "day" || period === "yesterday" || period === "3days") return "toStartOfHour(ts)";
  if (period === "week") return "toStartOfInterval(ts, INTERVAL 4 HOUR)";
  return "toStartOfDay(ts)";
}

function clickhouseDate(date: Date) {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

function parseClickhouseDate(value: string) {
  return new Date(`${value.replace(" ", "T")}Z`);
}
