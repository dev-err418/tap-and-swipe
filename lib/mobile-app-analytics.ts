import "server-only";

type Period = "day" | "yesterday" | "3days" | "week" | "month" | "all";

export type MobileAppTrendPoint = {
  bucket: Date;
  downloads: number;
  revenue: number;
};

export type MobileAppCountryRow = {
  country: string;
  installs: number;
  proceeds: number;
  trials: number;
  converted: number;
  paid: number;
};

export type MobileAppPlanCountryRow = {
  country: string;
  installs: number;
  yearlySubs: number;
  weeklySubs: number;
  yearlyProceeds: number;
  weeklyProceeds: number;
};

export type RetentionSlice = {
  eligible: number;
  retained: number;
};

export type MobileAppRetentionCountryRow = {
  country: string;
  installs: number;
  overall: { d1: RetentionSlice; d7: RetentionSlice; d30: RetentionSlice };
  yearly: { d1: RetentionSlice; d7: RetentionSlice; d30: RetentionSlice };
  weekly: { d1: RetentionSlice; d7: RetentionSlice; d30: RetentionSlice };
};

export type MobileAppAnalytics = {
  id: "glow" | "poky" | "versy";
  name: string;
  iconUrl: string;
  downloads: number;
  revenueCents: number;
  paid: number;
  trend: MobileAppTrendPoint[];
  countries: MobileAppCountryRow[];
  plans: MobileAppPlanCountryRow[];
  retention: MobileAppRetentionCountryRow[];
};

const SUPERWALL_ORGANIZATION_ID = 16256;
const POKY_APPLICATION_ID = 49771;
const VERSY_SUPERWALL_ORGANIZATION_ID = 25476;
const VERSY_SUPERWALL_APPLICATION_ID = 51393;
const GLOW_SUPERWALL_ORGANIZATION_ID = 27020;
const GLOW_SUPERWALL_APPLICATION_ID = 54736;
const ALL_TIME_START = new Date("2024-01-01T00:00:00.000Z");

const POKY_ICON_URL =
  "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/5e/46/3f/5e463fde-45e6-7fdc-ce5a-bb5b73af405d/AppIcon-0-0-1x_U007ephone-0-1-sRGB-85-220.png/512x512bb.jpg";
const VERSY_ICON_URL =
  "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/a6/20/46/a6204617-8071-fad1-c8b2-fb6dc8ea300b/AppIcon-0-0-1x_U007ephone-0-1-85-220.png/512x512bb.jpg";
const GLOW_ICON_URL =
  "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/19/20/0e/19200e98-f11f-8ab4-850a-81a2a45122e0/AppIcon-0-0-1x_U007ephone-0-1-0-sRGB-85-220.png/512x512bb.jpg";

export async function getMobileAppById(period: Period, id: MobileAppAnalytics["id"]) {
  if (id === "poky") return getPokyAnalytics(period, true);
  if (id === "glow") return getGlowAnalytics(period, true);
  return getVersyAnalytics(period, true);
}

export async function getMobileAppAnalytics(period: Period) {
  const results = await Promise.allSettled([
    getPokyAnalytics(period),
    getGlowAnalytics(period),
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

async function getGlowAnalytics(period: Period, includeCountries = false): Promise<MobileAppAnalytics> {
  const apiKey = process.env.SUPERWALL_GLOW_API_KEY?.trim();
  if (!apiKey) throw new Error("SUPERWALL_GLOW_API_KEY is not configured");

  return getSuperwallAppAnalytics(period, {
    id: "glow",
    name: "Glow",
    iconUrl: GLOW_ICON_URL,
    organizationId: GLOW_SUPERWALL_ORGANIZATION_ID,
    applicationId: GLOW_SUPERWALL_APPLICATION_ID,
    apiKey,
  }, includeCountries);
}

async function getPokyAnalytics(period: Period, includeCountries = false): Promise<MobileAppAnalytics> {
  const apiKey = process.env.SUPERWALL_POKY_API_KEY?.trim();
  if (!apiKey) throw new Error("SUPERWALL_POKY_API_KEY is not configured");

  return getSuperwallAppAnalytics(period, {
    id: "poky",
    name: "Poky",
    iconUrl: POKY_ICON_URL,
    organizationId: SUPERWALL_ORGANIZATION_ID,
    applicationId: POKY_APPLICATION_ID,
    apiKey,
  }, includeCountries);
}

async function getVersyAnalytics(period: Period, includeCountries = false): Promise<MobileAppAnalytics> {
  const apiKey = process.env.SUPERWALL_VERSY_API_KEY?.trim();
  if (!apiKey) throw new Error("SUPERWALL_VERSY_API_KEY is not configured");

  return getSuperwallAppAnalytics(period, {
    id: "versy",
    name: "Versy",
    iconUrl: VERSY_ICON_URL,
    organizationId: VERSY_SUPERWALL_ORGANIZATION_ID,
    applicationId: VERSY_SUPERWALL_APPLICATION_ID,
    apiKey,
  }, includeCountries);
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
  includeCountries = false,
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

  const countries = includeCountries ? await getSuperwallCountryBreakdown(app, start, end) : [];
  const plans = includeCountries ? await getSuperwallPlanBreakdown(app, start, end).catch(() => []) : [];
  const retention = includeCountries ? await getSuperwallRetentionBreakdown(app, start, end).catch(() => []) : [];
  const paid = includeCountries
    ? await getSuperwallPaidCount(app, start, end).catch(() =>
        countries.reduce((sum, row) => sum + row.paid, 0),
      )
    : 0;

  return {
    id: app.id,
    name: app.name,
    iconUrl: app.iconUrl,
    downloads: trend.reduce((sum, point) => sum + point.downloads, 0),
    revenueCents: Math.round(trend.reduce((sum, point) => sum + point.revenue, 0) * 100),
    paid,
    trend,
    countries,
    plans,
    retention,
  };
}

async function getSuperwallPaidCount(app: SuperwallAppConfig, start: string, end: string) {
  const rows = await querySuperwall<{ paid: string | number }>(
    `
SELECT uniq(originalTransactionId) AS paid
FROM open_revenue.attributed_events_by_ts_rep FINAL
WHERE applicationId = ${app.applicationId}
  AND isSandbox = 0
  AND source = 'integration'
  AND isFamilyShare = 0
  AND ts >= toDateTime64('${start}', 6, 'UTC')
  AND ts < toDateTime64('${end}', 6, 'UTC')
  AND ts < now()
  AND (
    (name = 'initial_purchase' AND lower(ifNull(periodType, '')) != 'trial')
    OR (name = 'renewal' AND isTrialConversion = 1)
  )
FORMAT JSON
`.trim(),
    app.organizationId,
    app.apiKey,
  );
  return Number(rows[0]?.paid ?? 0);
}

async function getSuperwallCountryBreakdown(
  app: SuperwallAppConfig,
  start: string,
  end: string,
): Promise<MobileAppCountryRow[]> {
  const installsQuery = `
    SELECT
      upper(ifNull(nullIf(JSONExtractString(headers, 'Cf-Ipcountry'), ''), 'unknown')) AS country,
      uniq(appUserId) AS installs
    FROM sw.demand_score_events_rep
    WHERE applicationId = ${app.applicationId}
      AND isSandbox = 0
      AND name = 'device_attributes'
      AND appInstallDate >= toDateTime64('${start}', 6, 'UTC')
      AND appInstallDate < toDateTime64('${end}', 6, 'UTC')
      AND ts >= toDateTime64('${start}', 6, 'UTC')
      AND ts < now()
    GROUP BY country
    FORMAT JSON
  `;
  const proceedsQuery = `
    SELECT countryCode AS country, round(sum(net_proceeds), 2) AS proceeds
    FROM (
      SELECT
        ifNull(nullIf(countryCode, ''), 'unknown') AS countryCode,
        name,
        originalTransactionId,
        transactionId,
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
      GROUP BY countryCode, name, originalTransactionId, transactionId
    )
    GROUP BY countryCode
    FORMAT JSON
  `;
  const trialsQuery = `
    SELECT countryCode AS country, uniq(originalTransactionId) AS trials
    FROM (
      SELECT
        ifNull(nullIf(countryCode, ''), 'unknown') AS countryCode,
        originalTransactionId,
        transactionId,
        argMax(periodType, attributionTs) AS periodType
      FROM open_revenue.attributed_events_by_ts_rep FINAL
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND source = 'integration'
        AND name = 'initial_purchase'
        AND isFamilyShare = 0
        AND ts >= toDateTime64('${start}', 6, 'UTC')
        AND ts < toDateTime64('${end}', 6, 'UTC')
        AND ts < now()
      GROUP BY countryCode, originalTransactionId, transactionId
    )
    WHERE lower(periodType) = 'trial'
    GROUP BY countryCode
    FORMAT JSON
  `;
  const convertedQuery = `
    SELECT countryCode AS country, uniq(originalTransactionId) AS converted
    FROM (
      SELECT
        ifNull(nullIf(countryCode, ''), 'unknown') AS countryCode,
        originalTransactionId,
        transactionId,
        argMax(isTrialConversion, attributionTs) AS isTrialConversion
      FROM open_revenue.attributed_events_by_ts_rep FINAL
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND source = 'integration'
        AND name = 'renewal'
        AND isFamilyShare = 0
        AND ts >= toDateTime64('${start}', 6, 'UTC')
        AND ts < toDateTime64('${end}', 6, 'UTC')
        AND ts < now()
      GROUP BY countryCode, originalTransactionId, transactionId
    )
    WHERE isTrialConversion = 1
    GROUP BY countryCode
    FORMAT JSON
  `;
  const paidQuery = `
    SELECT ifNull(nullIf(countryCode, ''), 'unknown') AS country, uniq(originalTransactionId) AS paid
    FROM open_revenue.attributed_events_by_ts_rep FINAL
    WHERE applicationId = ${app.applicationId}
      AND isSandbox = 0
      AND source = 'integration'
      AND isFamilyShare = 0
      AND ts >= toDateTime64('${start}', 6, 'UTC')
      AND ts < toDateTime64('${end}', 6, 'UTC')
      AND ts < now()
      AND (
        (name = 'initial_purchase' AND lower(ifNull(periodType, '')) != 'trial')
        OR (name = 'renewal' AND isTrialConversion = 1)
      )
    GROUP BY country
    FORMAT JSON
  `;

  try {
    const [installResult, proceedResult, trialResult, convertedResult, paidResult] = await Promise.allSettled([
      querySuperwall<{ country: string; installs: string | number }>(
        installsQuery,
        app.organizationId,
        app.apiKey,
      ),
      querySuperwall<{ country: string; proceeds: string | number | null }>(
        proceedsQuery,
        app.organizationId,
        app.apiKey,
      ),
      querySuperwall<{ country: string; trials: string | number }>(
        trialsQuery,
        app.organizationId,
        app.apiKey,
      ),
      querySuperwall<{ country: string; converted: string | number }>(
        convertedQuery,
        app.organizationId,
        app.apiKey,
      ),
      querySuperwall<{ country: string; paid: string | number }>(
        paidQuery,
        app.organizationId,
        app.apiKey,
      ),
    ]);
    const failed = [installResult, proceedResult, trialResult, convertedResult, paidResult].find(
      (result) => result.status === "rejected",
    );
    if (failed && failed.status === "rejected") {
      const log = process.env.NODE_ENV === "development" ? console.warn : console.error;
      log("tap_and_swipe.mobile_app_countries_partial", {
        app: app.id,
        error: failed.reason instanceof Error ? failed.reason.message : String(failed.reason),
      });
    }
    return mergeCountries(
      installResult.status === "fulfilled"
        ? installResult.value.map((row) => ({ country: row.country, installs: Number(row.installs) }))
        : [],
      proceedResult.status === "fulfilled"
        ? proceedResult.value.map((row) => ({ country: row.country, proceeds: Number(row.proceeds ?? 0) }))
        : [],
      trialResult.status === "fulfilled"
        ? trialResult.value.map((row) => ({ country: row.country, trials: Number(row.trials) }))
        : [],
      convertedResult.status === "fulfilled"
        ? convertedResult.value.map((row) => ({ country: row.country, converted: Number(row.converted) }))
        : [],
      paidResult.status === "fulfilled"
        ? paidResult.value.map((row) => ({ country: row.country, paid: Number(row.paid) }))
        : [],
    );
  } catch (error) {
    const log = process.env.NODE_ENV === "development" ? console.warn : console.error;
    log("tap_and_swipe.mobile_app_countries_failed", {
      app: app.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
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
      if (!response.ok) {
        const exception = body.match(/"exception"\s*:\s*"((?:\\.|[^"\\])*)"/)?.[1];
        throw new Error(
          exception
            ? `Superwall query returned ${response.status}: ${exception.slice(0, 240)}`
            : `Superwall query returned ${response.status}`,
        );
      }
      const parsed = JSON.parse(body) as { data?: T[] };
      return parsed.data ?? [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("Superwall query failed");
}

async function getSuperwallRetentionBreakdown(
  app: SuperwallAppConfig,
  start: string,
  end: string,
): Promise<MobileAppRetentionCountryRow[]> {
  const rows = await querySuperwall<{
    country: string;
    productId: string | null;
    startedAt: string;
    expiresAt: string | null;
  }>(
    `
SELECT
  ifNull(nullIf(any(countryCode), ''), 'unknown') AS country,
  any(productId) AS productId,
  minIf(ts, name = 'initial_purchase') AS startedAt,
  max(expirationAt) AS expiresAt
FROM open_revenue.attributed_events_by_ts_rep FINAL
WHERE applicationId = ${app.applicationId}
  AND isSandbox = 0
  AND source = 'integration'
  AND isFamilyShare = 0
  AND name IN ('initial_purchase', 'renewal', 'cancellation')
  AND ts >= toDateTime64('${start}', 6, 'UTC')
  AND ts < now()
GROUP BY originalTransactionId
HAVING startedAt >= toDateTime64('${start}', 6, 'UTC')
  AND startedAt < toDateTime64('${end}', 6, 'UTC')
LIMIT 20000
FORMAT JSON
`.trim(),
    app.organizationId,
    app.apiKey,
  );

  const now = Date.now();
  const points = new Map<string, MobileAppRetentionCountryRow>();
  for (const row of rows) {
    const startedAt = Date.parse(row.startedAt);
    if (!Number.isFinite(startedAt)) continue;
    const expiresAt = row.expiresAt ? Date.parse(row.expiresAt) : Number.NaN;
    const country = normalizeCountry(row.country);
    const plan = planFromProductId(row.productId);
    const point = points.get(country) ?? emptyRetentionRow(country);
    addRetention(point.overall, startedAt, expiresAt, now);
    if (plan === "yearly") addRetention(point.yearly, startedAt, expiresAt, now);
    if (plan === "weekly") addRetention(point.weekly, startedAt, expiresAt, now);
    points.set(country, point);
  }
  return [...points.values()].sort((a, b) => b.overall.d1.eligible - a.overall.d1.eligible);
}

function emptyRetentionRow(country: string): MobileAppRetentionCountryRow {
  const slice = (): RetentionSlice => ({ eligible: 0, retained: 0 });
  return {
    country,
    installs: 0,
    overall: { d1: slice(), d7: slice(), d30: slice() },
    yearly: { d1: slice(), d7: slice(), d30: slice() },
    weekly: { d1: slice(), d7: slice(), d30: slice() },
  };
}

function addRetention(
  group: MobileAppRetentionCountryRow["overall"],
  startedAt: number,
  expiresAt: number,
  now: number,
) {
  for (const [key, days] of [["d1", 1], ["d7", 7], ["d30", 30]] as const) {
    const checkpoint = startedAt + days * 86_400_000;
    if (checkpoint > now) continue;
    group[key].eligible += 1;
    if (Number.isFinite(expiresAt) && expiresAt > checkpoint) group[key].retained += 1;
  }
}

function planFromProductId(productId: string | null) {
  const value = (productId ?? "").toLowerCase();
  if (value.includes("week")) return "weekly";
  if (value.includes("year") || value.includes("annual")) return "yearly";
  return "other";
}

async function getSuperwallPlanBreakdown(
  app: SuperwallAppConfig,
  start: string,
  end: string,
): Promise<MobileAppPlanCountryRow[]> {
  const rows = await querySuperwall<{
    country: string;
    plan: string;
    subs: string | number;
    proceeds: string | number | null;
  }>(
    `
SELECT country, plan, uniq(originalTransactionId) AS subs, round(sum(net_proceeds), 2) AS proceeds
FROM (
  SELECT
    ifNull(nullIf(countryCode, ''), 'unknown') AS country,
    multiIf(
      positionCaseInsensitive(ifNull(productId, ''), 'week') > 0, 'weekly',
      positionCaseInsensitive(ifNull(productId, ''), 'year') > 0
        OR positionCaseInsensitive(ifNull(productId, ''), 'annual') > 0,
      'yearly',
      'other'
    ) AS plan,
    originalTransactionId,
    transactionId,
    name,
    if(
      argMax(isRefund, attributionTs) = 1,
      -abs(toFloat64(argMax(proceeds, attributionTs))),
      toFloat64(argMax(proceeds, attributionTs))
    ) AS net_proceeds
  FROM open_revenue.attributed_events_by_ts_rep FINAL
  WHERE applicationId = ${app.applicationId}
    AND isSandbox = 0
    AND source = 'integration'
    AND isFamilyShare = 0
    AND proceeds IS NOT NULL
    AND ts >= toDateTime64('${start}', 6, 'UTC')
    AND ts < toDateTime64('${end}', 6, 'UTC')
    AND ts < now()
    AND (
      (name = 'initial_purchase' AND lower(ifNull(periodType, '')) != 'trial')
      OR name = 'renewal'
    )
  GROUP BY country, plan, originalTransactionId, transactionId, name
)
GROUP BY country, plan
FORMAT JSON
`.trim(),
    app.organizationId,
    app.apiKey,
  );

  const points = new Map<string, MobileAppPlanCountryRow>();
  for (const row of rows) {
    const country = normalizeCountry(row.country);
    const point = points.get(country) ?? {
      country,
      installs: 0,
      yearlySubs: 0,
      weeklySubs: 0,
      yearlyProceeds: 0,
      weeklyProceeds: 0,
    };
    const subs = Number(row.subs);
    const proceeds = Number(row.proceeds ?? 0);
    if (row.plan === "yearly") {
      point.yearlySubs += subs;
      point.yearlyProceeds += proceeds;
    } else if (row.plan === "weekly") {
      point.weeklySubs += subs;
      point.weeklyProceeds += proceeds;
    }
    points.set(country, point);
  }
  return [...points.values()].sort(
    (a, b) => b.yearlySubs + b.weeklySubs - (a.yearlySubs + a.weeklySubs),
  );
}

function mergeCountries(
  installs: { country: string; installs: number }[],
  proceeds: { country: string; proceeds: number }[],
  trials: { country: string; trials: number }[] = [],
  converted: { country: string; converted: number }[] = [],
  paid: { country: string; paid: number }[] = [],
): MobileAppCountryRow[] {
  const points = new Map<string, MobileAppCountryRow>();
  const bump = (countryValue: string) => {
    const country = normalizeCountry(countryValue);
    const point = points.get(country) ?? { country, installs: 0, proceeds: 0, trials: 0, converted: 0, paid: 0 };
    points.set(country, point);
    return point;
  };
  for (const row of installs) bump(row.country).installs += row.installs;
  for (const row of proceeds) bump(row.country).proceeds += row.proceeds;
  for (const row of trials) bump(row.country).trials += row.trials;
  for (const row of converted) bump(row.country).converted += row.converted;
  for (const row of paid) bump(row.country).paid += row.paid;
  return [...points.values()].sort((a, b) => b.installs - a.installs || b.proceeds - a.proceeds);
}

function normalizeCountry(value: string) {
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "unknown";
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
