import "server-only";
import { orderAppExperiments } from "./app-experiment-order";
import { appAnalyticsPeriodRange as periodRange, appAnalyticsTrendBucket as trendBucket, appAnalyticsBucketSql as superwallBucketExpression } from "./app-analytics-time";
import { loadNativePaywalls } from "./native-paywall-queries";
import { loadJournalPractice } from "./journal-practice-queries";
import type { JournalPracticeReport } from "./journal-practice-analytics";
import type { NativePaywallReport } from "./native-paywall-analytics";
import { isMobileMoneyEvent } from "./mobile-app-money";
import { POKY_NATIVE_RECOVERY_KEYS, pokyNativeRecoveryExperiment } from "./poky-native-recovery";
import { pokyPaywallMigrationExperiment } from "./poky-paywall-migration";

type Period = "day" | "yesterday" | "3days" | "week" | "month" | "all";

export type MobileAppTrendPoint = {
  bucket: Date;
  downloads: number;
  revenue: number;
  paid: number;
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

export type MobileAppExperimentSlice = {
  users: number;
  sessions: number;
  installs: number;
  completed: number;
  trials: number;
  converted: number;
  paid: number;
  proceeds: number;
  installsD7: number;
  proceedsD7: number;
  eligibleD7: number;
  retainedD7: number;
  installsD14: number;
  proceedsD14: number;
  eligibleD14: number;
  retainedD14: number;
  installsD30: number;
  proceedsD30: number;
  eligibleD30: number;
  retainedD30: number;
};

export type MobileAppExperimentVariant = MobileAppExperimentSlice & {
  key: string;
  label: string;
  countries: Record<string, MobileAppExperimentSlice>;
};

export type MobileAppExperimentScoreMetric =
  | "appu"
  | "download_paid"
  | "appu_d7"
  | "appu_d14"
  | "appu_d30"
  | "sessions_per_day";

export type MobileAppExperiment = {
  id: string;
  title: string;
  subtitle: string;
  variants: MobileAppExperimentVariant[];
  scoreMetrics?: MobileAppExperimentScoreMetric[];
  showCompletion?: boolean;
  showTrials?: boolean;
  showRetention?: boolean;
  showUsers?: boolean;
  showSessions?: boolean;
  showInstalls?: boolean;
  showPaid?: boolean;
  showDownloadPaid?: boolean;
  sessionDays?: number;
  languageComparisons?: { language: string; label: string; variants: MobileAppExperimentVariant[] }[];
};

export type TrialCancelBucket = {
  key: string;
  label: string;
  cancels: number;
  highlight?: boolean;
};

export type TrialCancelTiming = {
  trials: number;
  cancelled: number;
  cancelledBeforeQualified: number;
  buckets: TrialCancelBucket[];
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
  experiments: MobileAppExperiment[];
  trialCancelTiming?: TrialCancelTiming | null;
  nativePaywalls?: NativePaywallReport | null;
  journalPractice?: JournalPracticeReport | null;
};

const SUPERWALL_ORGANIZATION_ID = 16256;
const POKY_APPLICATION_ID = 49771;
const VERSY_SUPERWALL_ORGANIZATION_ID = 25476;
const VERSY_SUPERWALL_APPLICATION_ID = 51393;
const GLOW_SUPERWALL_ORGANIZATION_ID = 27020;
const GLOW_SUPERWALL_APPLICATION_ID = 54736;
const GLOW_NATIVE_PAYWALL_MIN_VERSION = [1, 7, 0] as const;
const ANALYTICS_CACHE_MS = 90_000;
const MAX_QUERY_CONCURRENCY = 6;
const EVENT_DUMP_LIMIT = 50_000;
const DAY_MS = 86_400_000;

const POKY_ICON_URL =
  "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/5e/46/3f/5e463fde-45e6-7fdc-ce5a-bb5b73af405d/AppIcon-0-0-1x_U007ephone-0-1-sRGB-85-220.png/512x512bb.jpg";
const VERSY_ICON_URL =
  "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/a6/20/46/a6204617-8071-fad1-c8b2-fb6dc8ea300b/AppIcon-0-0-1x_U007ephone-0-1-85-220.png/512x512bb.jpg";
const GLOW_ICON_URL =
  "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/19/20/0e/19200e98-f11f-8ab4-850a-81a2a45122e0/AppIcon-0-0-1x_U007ephone-0-1-0-sRGB-85-220.png/512x512bb.jpg";

const GLOW_ATTRIBUTE_KEYS = ["onboarding_variant", "yearly_product", "widget_screen_seen"] as const;
const POKY_ATTRIBUTE_KEYS = ["onboarding_plan_variant", "onboarding_plan_allocation", "home_experience_variant", "home_experience_allocation", "poky_tracking_environment", ...POKY_NATIVE_RECOVERY_KEYS] as const;

type SuperwallAppConfig = {
  id: MobileAppAnalytics["id"];
  name: string;
  iconUrl: string;
  organizationId: number;
  applicationId: number;
  apiKey: string;
};

type InstallRow = {
  appUserId: string;
  country: string;
  appVersion: string;
  language: string;
  installedAt: number;
};

type AttributedRow = {
  appUserId: string;
  name: string;
  originalTransactionId: string;
  transactionId: string;
  country: string;
  appVersion: string;
  productId: string;
  periodType: string;
  isTrialConversion: boolean;
  netProceeds: number | null;
  eventTs: number;
  attributionTs: number;
  installedAt: number;
  expiresAt: number;
};

type SessionRow = {
  appUserId: string;
  country: string;
  sessions: number;
};

type AppFacts = {
  startMs: number;
  endMs: number;
  sessionDays: number;
  installs: InstallRow[];
  attributes: Map<string, Record<string, string>>;
  events: AttributedRow[];
  sessions: SessionRow[];
};

type AttributeExperimentDefinition = {
  id: string;
  title: string;
  subtitle: string;
  attributeKeys: string[];
  variants: { key: string; label: string; attributes: Record<string, string> }[];
  scoreMetrics: MobileAppExperimentScoreMetric[];
  showRetention?: boolean;
  showTrials?: boolean;
  showCompletion?: boolean;
  countAssignedUsers?: boolean;
  includeSessions?: boolean;
  showUsers?: boolean;
  showSessions?: boolean;
  showInstalls?: boolean;
  showPaid?: boolean;
  showDownloadPaid?: boolean;
};

type CacheEntry<T> = { expiresAt: number; value: T };

const analyticsCache = new Map<string, CacheEntry<MobileAppAnalytics>>();
const analyticsInflight = new Map<string, Promise<MobileAppAnalytics>>();
let activeQueries = 0;
const queryWaiters: Array<() => void> = [];

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
    logAnalytics("tap_and_swipe.mobile_app_analytics_failed", {
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
    return [];
  });
}

async function getGlowAnalytics(period: Period, includeCountries = false): Promise<MobileAppAnalytics> {
  const apiKey = process.env.SUPERWALL_GLOW_API_KEY?.trim();
  if (!apiKey) throw new Error("SUPERWALL_GLOW_API_KEY is not configured");

  return getSuperwallAppAnalytics(
    period,
    {
      id: "glow",
      name: "Glow",
      iconUrl: GLOW_ICON_URL,
      organizationId: GLOW_SUPERWALL_ORGANIZATION_ID,
      applicationId: GLOW_SUPERWALL_APPLICATION_ID,
      apiKey,
    },
    includeCountries,
  );
}

async function getPokyAnalytics(period: Period, includeCountries = false): Promise<MobileAppAnalytics> {
  const apiKey = process.env.SUPERWALL_POKY_API_KEY?.trim();
  if (!apiKey) throw new Error("SUPERWALL_POKY_API_KEY is not configured");

  return getSuperwallAppAnalytics(
    period,
    {
      id: "poky",
      name: "Poky",
      iconUrl: POKY_ICON_URL,
      organizationId: SUPERWALL_ORGANIZATION_ID,
      applicationId: POKY_APPLICATION_ID,
      apiKey,
    },
    includeCountries,
  );
}

async function getVersyAnalytics(period: Period, includeCountries = false): Promise<MobileAppAnalytics> {
  const apiKey = process.env.SUPERWALL_VERSY_API_KEY?.trim();
  if (!apiKey) throw new Error("SUPERWALL_VERSY_API_KEY is not configured");

  return getSuperwallAppAnalytics(
    period,
    {
      id: "versy",
      name: "Versy",
      iconUrl: VERSY_ICON_URL,
      organizationId: VERSY_SUPERWALL_ORGANIZATION_ID,
      applicationId: VERSY_SUPERWALL_APPLICATION_ID,
      apiKey,
    },
    includeCountries,
  );
}

async function getSuperwallAppAnalytics(
  period: Period,
  app: SuperwallAppConfig,
  includeCountries = false,
): Promise<MobileAppAnalytics> {
  const cacheKey = `${app.id}:${period}:${includeCountries ? "detail" : "list"}`;
  const hit = analyticsCache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  const pending = analyticsInflight.get(cacheKey);
  if (pending) return pending;

  const promise = loadSuperwallAppAnalytics(period, app, includeCountries).then(
    (value) => {
      analyticsCache.set(cacheKey, { expiresAt: Date.now() + ANALYTICS_CACHE_MS, value });
      analyticsInflight.delete(cacheKey);
      return value;
    },
    (error) => {
      analyticsInflight.delete(cacheKey);
      throw error;
    },
  );
  analyticsInflight.set(cacheKey, promise);
  return promise;
}

async function loadSuperwallAppAnalytics(
  period: Period,
  app: SuperwallAppConfig,
  includeCountries: boolean,
): Promise<MobileAppAnalytics> {
  const { since, before } = periodRange(period);
  const bucketExpression = superwallBucketExpression(period);
  const start = clickhouseDate(since);
  const end = clickhouseDate(before);
  const startMs = since.getTime();
  const endMs = before.getTime();

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
      SELECT ${bucketExpression} AS bucket, name, originalTransactionId, transactionId, isRefund,
        if(
          isRefund = 1,
          -abs(toFloat64(argMax(proceeds, attributionTs))),
          toFloat64(argMax(proceeds, attributionTs))
        ) AS net_proceeds
      FROM open_revenue.attributed_events_by_ts_rep FINAL
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND source = 'integration'
        AND (name IN ('initial_purchase', 'renewal', 'non_renewing_purchase') OR isRefund = 1)
        AND isFamilyShare = 0
        AND proceeds IS NOT NULL
        AND ts >= toDateTime64('${start}', 6, 'UTC')
        AND ts < toDateTime64('${end}', 6, 'UTC')
        AND ts < now()
      GROUP BY bucket, name, originalTransactionId, transactionId, isRefund
    )
    GROUP BY bucket
    ORDER BY bucket
    FORMAT JSON
  `;

  const [downloadResult, revenueResult, factsResult, paywallResult, journalPracticeResult] = await Promise.allSettled([
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
    includeCountries ? loadAppFacts(app, start, end, startMs, endMs) : Promise.resolve(null),
    includeCountries && (app.id === "glow" || app.id === "poky")
      ? loadNativePaywalls(<T,>(sql: string) => querySuperwall<T>(sql, app.organizationId, app.apiKey), app.applicationId, startMs, endMs)
      : Promise.resolve(null),
    includeCountries && app.id === "glow"
      ? loadJournalPractice(<T,>(sql: string) => querySuperwall<T>(sql, app.organizationId, app.apiKey), app.applicationId, startMs, endMs)
      : Promise.resolve(null),
  ]);

  if (downloadResult.status === "rejected") throw downloadResult.reason;
  if (revenueResult.status === "rejected") throw revenueResult.reason;
  if (factsResult.status === "rejected") {
    logAnalytics("tap_and_swipe.mobile_app_facts_failed", {
      app: app.id,
      error: factsResult.reason instanceof Error ? factsResult.reason.message : String(factsResult.reason),
    });
  }

  const facts = factsResult.status === "fulfilled" ? factsResult.value : null;
  const trend = mergeTrend(
    downloadResult.value.map((row) => ({
      bucket: parseClickhouseDate(row.bucket),
      downloads: Number(row.downloads),
    })),
    revenueResult.value.map((row) => ({
      bucket: parseClickhouseDate(row.bucket),
      revenue: Number(row.revenue ?? 0),
    })),
    facts ? paidTrendFromFacts(facts, period) : [],
  );
  const countries = facts ? countriesFromFacts(facts) : [];
  const includePlanCards = Boolean(facts) && app.id !== "glow";
  const plans = includePlanCards && facts ? plansFromFacts(facts) : [];
  const retention = includePlanCards && facts ? retentionFromFacts(facts) : [];
  const experiments = facts
    ? app.id === "glow"
      ? glowExperiments(facts)
      : app.id === "poky"
        ? pokyExperiments(facts)
        : []
    : [];
  const trialCancelTiming = facts && app.id === "glow" ? trialCancelFromFacts(facts) : null;

  return {
    id: app.id,
    name: app.name,
    iconUrl: app.iconUrl,
    downloads: trend.reduce((sum, point) => sum + point.downloads, 0),
    revenueCents: Math.round(trend.reduce((sum, point) => sum + point.revenue, 0) * 100),
    paid: countries.reduce((sum, row) => sum + row.paid, 0),
    trend,
    countries,
    plans,
    retention,
    experiments: orderAppExperiments(app.id, experiments),
    trialCancelTiming,
    journalPractice: journalPracticeResult.status === "fulfilled" ? journalPracticeResult.value : {
      status: "unavailable", asOf: Date.now(), rows: [], warnings: ["Activity reporting is temporarily unavailable."],
    },
    nativePaywalls: paywallResult.status === "fulfilled" ? paywallResult.value : {
      status: "unavailable", asOf: Date.now(), groups: [], warnings: ["Paywall reporting is temporarily unavailable."],
    },
  };
}

async function loadAppFacts(
  app: SuperwallAppConfig,
  start: string,
  end: string,
  startMs: number,
  endMs: number,
): Promise<AppFacts> {
  const keys = attributeKeysFor(app.id);
  const sessionRange = sessionWindow(startMs, endMs);
  const [installResult, attributeResult, eventResult, sessionResult] = await Promise.allSettled([
    fetchInstallCohort(app, start, end),
    keys.length ? fetchUserAttributes(app, keys) : Promise.resolve([]),
    fetchAttributedEvents(app, start),
    app.id === "poky" ? fetchSessionStarts(app, sessionRange.from, sessionRange.to) : Promise.resolve([]),
  ]);

  for (const [label, result] of [
    ["installs", installResult],
    ["attributes", attributeResult],
    ["events", eventResult],
    ["sessions", sessionResult],
  ] as const) {
    if (result.status === "rejected") {
      logAnalytics("tap_and_swipe.mobile_app_facts_partial", {
        app: app.id,
        part: label,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  }

  return {
    startMs,
    endMs,
    sessionDays: sessionRange.days,
    installs: installResult.status === "fulfilled" ? installResult.value : [],
    attributes: attributeResult.status === "fulfilled" ? attributeMap(attributeResult.value) : new Map(),
    events: eventResult.status === "fulfilled" ? eventResult.value : [],
    sessions: sessionResult.status === "fulfilled" ? sessionResult.value : [],
  };
}

function attributeKeysFor(id: SuperwallAppConfig["id"]) {
  if (id === "glow") return [...GLOW_ATTRIBUTE_KEYS];
  if (id === "poky") return [...POKY_ATTRIBUTE_KEYS];
  return [];
}

async function fetchInstallCohort(app: SuperwallAppConfig, start: string, end: string): Promise<InstallRow[]> {
  const rows = await querySuperwall<{
    appUserId: string;
    ver: string | null;
    country: string | null;
    installedAt: string | null;
    language: string | null;
  }>(
    `
SELECT
  appUserId,
  argMin(JSONExtractString(meta, 'appVersion'), ts) AS ver,
  argMin(JSONExtractString(meta, 'deviceLanguageCode'), ts) AS language,
  argMin(upper(ifNull(nullIf(JSONExtractString(headers, 'Cf-Ipcountry'), ''), 'unknown')), ts) AS country,
  argMin(appInstallDate, ts) AS installedAt
FROM sw.demand_score_events_rep
WHERE applicationId = ${app.applicationId}
  AND isSandbox = 0
  AND name = 'device_attributes'
  AND appInstallDate >= toDateTime64('${start}', 6, 'UTC')
  AND appInstallDate < toDateTime64('${end}', 6, 'UTC')
  AND ts >= toDateTime64('${start}', 6, 'UTC')
  AND ts < now()
GROUP BY appUserId
LIMIT 30000
FORMAT JSON
`.trim(),
    app.organizationId,
    app.apiKey,
  );

  return rows.flatMap((row) => {
    if (!row.appUserId) return [];
    const installedAt = parseTs(row.installedAt);
    if (!Number.isFinite(installedAt)) return [];
    return [
      {
        appUserId: row.appUserId,
        country: normalizeCountry(row.country ?? "unknown"),
        appVersion: (row.ver ?? "").trim(),
        language: (row.language ?? "").trim(),
        installedAt,
      },
    ];
  });
}

async function fetchUserAttributes(
  app: SuperwallAppConfig,
  keys: string[],
): Promise<{ appUserId: string; key: string; value: string }[]> {
  return querySuperwall<{ appUserId: string; key: string; value: string }>(
    `
SELECT appUserId, key, value
FROM sw.user_attributes_rep FINAL
WHERE applicationId = ${app.applicationId}
  AND isSandbox = 0
  AND isDeleted = 0
  AND ts < now()
  AND key IN (${keys.map((key) => `'${key}'`).join(", ")})
LIMIT 80000
FORMAT JSON
`.trim(),
    app.organizationId,
    app.apiKey,
  );
}

async function fetchAttributedEvents(app: SuperwallAppConfig, start: string): Promise<AttributedRow[]> {
  const rows = await querySuperwall<{
    appUserId: string | null;
    name: string;
    originalTransactionId: string;
    transactionId: string | null;
    country: string | null;
    ver: string | null;
    sku: string | null;
    period: string | null;
    isTrialConversion: string | number;
    isRefund: string | number;
    proceeds: string | number | null;
    eventTs: string;
    attributionTs: string;
    installedAt: string | null;
    expiresAt: string | null;
  }>(
    `
SELECT
  appUserId,
  name,
  originalTransactionId,
  transactionId,
  ifNull(nullIf(countryCode, ''), 'unknown') AS country,
  ifNull(appVersion, '') AS ver,
  ifNull(productId, '') AS sku,
  lower(ifNull(periodType, '')) AS period,
  isTrialConversion,
  isRefund,
  proceeds,
  ts AS eventTs,
  attributionTs,
  installDate AS installedAt,
  expirationAt AS expiresAt
FROM open_revenue.attributed_events_by_ts_rep FINAL
WHERE applicationId = ${app.applicationId}
  AND isSandbox = 0
  AND source = 'integration'
  AND isFamilyShare = 0
  AND (name IN ('initial_purchase', 'renewal', 'non_renewing_purchase', 'cancellation') OR isRefund = 1)
  AND ts >= toDateTime64('${start}', 6, 'UTC')
  AND ts < now()
LIMIT ${EVENT_DUMP_LIMIT}
FORMAT JSON
`.trim(),
    app.organizationId,
    app.apiKey,
  );

  if (rows.length >= EVENT_DUMP_LIMIT) {
    logAnalytics("tap_and_swipe.mobile_app_event_dump_truncated", { app: app.id, limit: EVENT_DUMP_LIMIT });
  }

  const best = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = `${row.name}|${row.originalTransactionId}|${row.transactionId ?? ""}|${Number(row.isRefund) === 1}`;
    const prev = best.get(key);
    const attributionTs = parseTs(row.attributionTs);
    if (!prev || parseTs(prev.attributionTs) < attributionTs) best.set(key, row);
  }

  return [...best.values()].flatMap((row) => {
    const eventTs = parseTs(row.eventTs);
    if (!Number.isFinite(eventTs)) return [];
    const proceeds = row.proceeds == null || row.proceeds === "" ? null : Number(row.proceeds);
    const isRefund = Number(row.isRefund) === 1;
    return [
      {
        appUserId: row.appUserId ?? "",
        name: row.name,
        originalTransactionId: row.originalTransactionId,
        transactionId: row.transactionId ?? "",
        country: normalizeCountry(row.country ?? "unknown"),
        appVersion: (row.ver ?? "").trim(),
        productId: row.sku ?? "",
        periodType: (row.period ?? "").toLowerCase(),
        isTrialConversion: Number(row.isTrialConversion) === 1,
        netProceeds: proceeds == null || !Number.isFinite(proceeds) ? null : isRefund ? -Math.abs(proceeds) : proceeds,
        eventTs,
        attributionTs: parseTs(row.attributionTs),
        installedAt: parseTs(row.installedAt),
        expiresAt: parseTs(row.expiresAt),
      },
    ];
  });
}

function sessionWindow(startMs: number, endMs: number) {
  const to = Math.min(endMs, Date.now());
  const from = Math.max(startMs, to - 7 * DAY_MS);
  return {
    from,
    to,
    days: Math.max((to - from) / DAY_MS, 1 / 24),
  };
}

async function fetchSessionStarts(app: SuperwallAppConfig, fromMs: number, toMs: number): Promise<SessionRow[]> {
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs >= toMs) return [];
  const windows = eventRepWindows(fromMs, toMs);
  const chunks = await Promise.allSettled(
    windows.map(([winStart, winEnd]) =>
      querySuperwall<{ appUserId: string; country: string; sessions: string | number }>(
        `
SELECT
  appUserId,
  upper(ifNull(nullIf(JSONExtractString(headers, 'Cf-Ipcountry'), ''), 'unknown')) AS country,
  count() AS sessions
FROM sw.events_rep
WHERE applicationId = ${app.applicationId}
  AND isSandbox = 0
  AND name = 'session_start'
  AND ts > toStartOfHour(toDateTime64('${winStart}', 6, 'UTC'))
  AND ts < toDateTime64('${winEnd}', 6, 'UTC')
  AND ts < now()
GROUP BY appUserId, country
LIMIT 20000
FORMAT JSON
`.trim(),
        app.organizationId,
        app.apiKey,
      ),
    ),
  );
  const byUser = new Map<string, SessionRow>();
  for (const chunk of chunks) {
    if (chunk.status !== "fulfilled") continue;
    for (const row of chunk.value) {
      if (!row.appUserId) continue;
      const current = byUser.get(row.appUserId) ?? {
        appUserId: row.appUserId,
        country: normalizeCountry(row.country),
        sessions: 0,
      };
      current.sessions += Number(row.sessions ?? 0);
      byUser.set(row.appUserId, current);
    }
  }
  return [...byUser.values()];
}

function attributeMap(rows: { appUserId: string; key: string; value: string }[]) {
  const attributes = new Map<string, Record<string, string>>();
  for (const row of rows) {
    if (!row.appUserId || !row.key) continue;
    const current = attributes.get(row.appUserId) ?? {};
    // gp1 values are JSON: lowercasing destroys camelCase contract fields.
    current[row.key] = (row.value ?? "").trim();
    attributes.set(row.appUserId, current);
  }
  return attributes;
}

function countriesFromFacts(facts: AppFacts): MobileAppCountryRow[] {
  const points = new Map<string, MobileAppCountryRow>();
  const bump = (countryValue: string) => {
    const country = normalizeCountry(countryValue);
    const point = points.get(country) ?? { country, installs: 0, proceeds: 0, trials: 0, converted: 0, paid: 0 };
    points.set(country, point);
    return point;
  };
  for (const row of facts.installs) bump(row.country).installs += 1;

  const trialIds = new Set<string>();
  const convertedIds = new Set<string>();
  const paidIds = new Set<string>();
  for (const event of facts.events) {
    if (event.eventTs < facts.startMs || event.eventTs >= facts.endMs) continue;
    const point = bump(event.country);
    const id = `${event.country}|${event.originalTransactionId}`;
    if (event.netProceeds != null && isMobileMoneyEvent(event)) {
      point.proceeds = roundMoney(point.proceeds + event.netProceeds);
    }
    if (event.name === "initial_purchase" && event.periodType === "trial" && !trialIds.has(id)) {
      trialIds.add(id);
      point.trials += 1;
    }
    if (event.name === "renewal" && event.isTrialConversion && !convertedIds.has(id)) {
      convertedIds.add(id);
      point.converted += 1;
    }
    if (isPaidEvent(event) && !paidIds.has(id)) {
      paidIds.add(id);
      point.paid += 1;
    }
  }
  return [...points.values()].sort((a, b) => b.installs - a.installs || b.proceeds - a.proceeds);
}

function plansFromFacts(facts: AppFacts): MobileAppPlanCountryRow[] {
  const points = new Map<string, MobileAppPlanCountryRow>();
  const seen = new Set<string>();
  for (const event of facts.events) {
    if (event.eventTs < facts.startMs || event.eventTs >= facts.endMs) continue;
    if (event.netProceeds == null) continue;
    if (!isMobileMoneyEvent(event)) continue;
    const plan = planFromProductId(event.productId);
    if (plan !== "yearly" && plan !== "weekly") continue;
    const country = normalizeCountry(event.country);
    const point = points.get(country) ?? {
      country,
      installs: 0,
      yearlySubs: 0,
      weeklySubs: 0,
      yearlyProceeds: 0,
      weeklyProceeds: 0,
    };
    const id = `${country}|${plan}|${event.originalTransactionId}`;
    const startsPaidSubscription =
      (event.name === "initial_purchase" && event.periodType !== "trial") || event.name === "renewal";
    if (startsPaidSubscription && !seen.has(id)) {
      seen.add(id);
      if (plan === "yearly") point.yearlySubs += 1;
      else point.weeklySubs += 1;
    }
    if (plan === "yearly") point.yearlyProceeds = roundMoney(point.yearlyProceeds + event.netProceeds);
    else point.weeklyProceeds = roundMoney(point.weeklyProceeds + event.netProceeds);
    points.set(country, point);
  }
  return [...points.values()].sort(
    (a, b) => b.yearlySubs + b.weeklySubs - (a.yearlySubs + a.weeklySubs),
  );
}

function retentionFromFacts(facts: AppFacts): MobileAppRetentionCountryRow[] {
  const now = Date.now();
  const byTxn = new Map<
    string,
    { country: string; productId: string; startedAt: number; expiresAt: number }
  >();
  for (const event of facts.events) {
    if (!["initial_purchase", "renewal", "cancellation"].includes(event.name)) continue;
    const current = byTxn.get(event.originalTransactionId) ?? {
      country: event.country,
      productId: event.productId,
      startedAt: Number.POSITIVE_INFINITY,
      expiresAt: Number.NaN,
    };
    if (event.name === "initial_purchase") current.startedAt = Math.min(current.startedAt, event.eventTs);
    if (Number.isFinite(event.expiresAt)) {
      current.expiresAt = Number.isFinite(current.expiresAt)
        ? Math.max(current.expiresAt, event.expiresAt)
        : event.expiresAt;
    }
    byTxn.set(event.originalTransactionId, current);
  }

  const points = new Map<string, MobileAppRetentionCountryRow>();
  for (const row of byTxn.values()) {
    if (row.startedAt < facts.startMs || row.startedAt >= facts.endMs) continue;
    const country = normalizeCountry(row.country);
    const plan = planFromProductId(row.productId);
    const point = points.get(country) ?? emptyRetentionRow(country);
    addRetention(point.overall, row.startedAt, row.expiresAt, now);
    if (plan === "yearly") addRetention(point.yearly, row.startedAt, row.expiresAt, now);
    if (plan === "weekly") addRetention(point.weekly, row.startedAt, row.expiresAt, now);
    points.set(country, point);
  }
  return [...points.values()].sort((a, b) => b.overall.d1.eligible - a.overall.d1.eligible);
}

function glowExperiments(facts: AppFacts): MobileAppExperiment[] {
  return [
    glowPaywallExperiment(facts),
    attributeExperiment(facts, {
      id: "glow-yearly-price",
      title: "Yearly price A/B test",
      subtitle: "$49.99 vs $59.99",
      attributeKeys: ["yearly_product"],
      variants: [
        {
          key: "annual",
          label: "$49.99",
          attributes: { yearly_product: "com.arthurbuildsstuff.glow.annual" },
        },
        {
          key: "pro_yearly",
          label: "$59.99",
          attributes: { yearly_product: "com.arthurbuildsstuff.glow.pro.yearly" },
        },
      ],
      scoreMetrics: ["appu", "download_paid"],
      showTrials: true,
    }),
    glowOnboardingExperiment(facts),
  ];
}

function glowPaywallExperiment(facts: AppFacts): MobileAppExperiment {
  const legacy = emptyExperimentVariant("legacy", "Superwall web");
  const native = emptyExperimentVariant("native", "Native paywall");
  const targetFor = (appVersion: string) => {
    const variant = paywallVariantForVersion(appVersion);
    if (variant === "native") return native;
    if (variant === "legacy") return legacy;
    return null;
  };

  const cohort = new Map<string, InstallRow>();
  for (const row of facts.installs) {
    const target = targetFor(row.appVersion);
    if (target) {
      cohort.set(row.appUserId, row);
      addExperimentMetrics(target, { country: row.country, installs: 1 });
    }
  }

  const seenTrial = new Set<string>();
  const seenConverted = new Set<string>();
  const seenPaid = new Set<string>();
  for (const event of facts.events) {
    const install = cohort.get(event.appUserId);
    if (!install || event.eventTs < install.installedAt) continue;
    const target = targetFor(install.appVersion);
    if (!target) continue;
    const id = `${install.appVersion}|${install.country}|${event.originalTransactionId}`;
    if (inRange(event.eventTs, facts.startMs, facts.endMs)) {
      addOutcomeMetrics(target, event, install.country, id, seenTrial, seenConverted, seenPaid);
    }
    if (event.netProceeds != null && isMobileMoneyEvent(event)) {
      addExperimentMetrics(target, { country: install.country, proceeds: event.netProceeds });
    }
  }

  return {
    id: "glow-native-paywall",
    title: "Paywall A/B test",
    subtitle: "1.7.0+ vs earlier",
    scoreMetrics: ["appu", "download_paid"],
    showTrials: true,
    variants: [legacy, native],
  };
}

function glowOnboardingExperiment(facts: AppFacts): MobileAppExperiment {
  return attributeExperiment(facts, {
    id: "glow-onboarding-copy",
    title: "Onboarding A/B test",
    subtitle: "IAM vs Copy",
    attributeKeys: ["onboarding_variant"],
    variants: [
      { key: "iam", label: "IAM", attributes: { onboarding_variant: "iam" } },
      { key: "copy", label: "Copy", attributes: { onboarding_variant: "copy" } },
    ],
    scoreMetrics: ["appu", "download_paid"],
    showTrials: true,
    showCompletion: true,
  });
}

function pokyExperiments(facts: AppFacts): MobileAppExperiment[] {
  return [
    pokyPaywallMigrationExperiment(facts),
    pokyNativeRecoveryExperiment(
      [...facts.attributes].flatMap(([appUserId, attrs]) => Object.entries(attrs).map(([key, value]) => ({ appUserId, key, value }))),
      facts.events, new Map(facts.installs.map((row) => [row.appUserId, row.country])), facts.startMs, facts.endMs,
    ),
    attributeExperiment(facts, {
      id: "poky-animated-plan",
      title: "Animated plan A/B test",
      subtitle: "Control vs Animated plan · fresh 50/50 assignments",
      attributeKeys: ["onboarding_plan_variant"],
      variants: [
        { key: "control", label: "Control", attributes: { onboarding_plan_variant: "control", onboarding_plan_allocation: "50_50" } },
        { key: "animated_plan", label: "Animated plan", attributes: { onboarding_plan_variant: "animated_plan", onboarding_plan_allocation: "50_50" } },
      ],
      scoreMetrics: ["appu_d7", "appu_d14", "appu_d30"],
      showRetention: true,
    }),
    attributeExperiment(facts, {
      id: "poky-app-experience",
      title: "App experience A/B test",
      subtitle: "Original vs AI Chat · fresh 50/50 assignments",
      attributeKeys: ["home_experience_variant"],
      variants: [
        { key: "control", label: "Original", attributes: { home_experience_variant: "control", home_experience_allocation: "50_50" } },
        { key: "new_experience", label: "AI Chat", attributes: { home_experience_variant: "new_experience", home_experience_allocation: "50_50" } },
      ],
      scoreMetrics: ["sessions_per_day", "appu_d7", "appu_d14", "appu_d30"],
      showRetention: true,
      countAssignedUsers: true,
      includeSessions: true,
      showUsers: true,
      showSessions: true,
      showInstalls: false,
      showPaid: false,
      showDownloadPaid: false,
    }),
    attributeExperiment(facts, {
      id: "poky-onboarding-abcd",
      title: "Onboarding A/B/C/D test",
      subtitle: "Extra animation × AI Chat · fresh 25/25/25/25 assignments",
      attributeKeys: ["onboarding_plan_variant", "home_experience_variant"],
      variants: [
        {
          key: "extra_original",
          label: "Extra animation + original",
          attributes: { onboarding_plan_variant: "control", onboarding_plan_allocation: "50_50", home_experience_variant: "control", home_experience_allocation: "50_50" },
        },
        {
          key: "extra_chat",
          label: "Extra animation + AI chat",
          attributes: { onboarding_plan_variant: "control", onboarding_plan_allocation: "50_50", home_experience_variant: "new_experience", home_experience_allocation: "50_50" },
        },
        {
          key: "intro_original",
          label: "Animated intro + original",
          attributes: { onboarding_plan_variant: "animated_plan", onboarding_plan_allocation: "50_50", home_experience_variant: "control", home_experience_allocation: "50_50" },
        },
        {
          key: "intro_chat",
          label: "Animated intro + AI chat",
          attributes: { onboarding_plan_variant: "animated_plan", onboarding_plan_allocation: "50_50", home_experience_variant: "new_experience", home_experience_allocation: "50_50" },
        },
      ],
      scoreMetrics: ["appu_d7", "appu_d14", "appu_d30"],
      showRetention: true,
    }),
  ];
}

function attributeExperiment(facts: AppFacts, definition: AttributeExperimentDefinition): MobileAppExperiment {
  const variants = definition.variants.map((variant) => emptyExperimentVariant(variant.key, variant.label));
  const targetFor = (attrs: Record<string, string> | undefined) => {
    if (!attrs) return null;
    if (definition.id.startsWith("poky-") && attrs.poky_tracking_environment !== "production") return null;
    const matched = definition.variants.find((variant) =>
      Object.entries(variant.attributes).every(
        ([key, value]) => (attrs[key] ?? "").trim().toLowerCase() === value,
      ),
    );
    return matched ? variants[definition.variants.indexOf(matched)] : null;
  };
  const now = Date.now();
  const countryByUser = new Map<string, string>();
  for (const row of facts.installs) countryByUser.set(row.appUserId, row.country);
  for (const row of facts.sessions) {
    if (!countryByUser.has(row.appUserId)) countryByUser.set(row.appUserId, row.country);
  }

  if (definition.countAssignedUsers) {
    for (const [appUserId, attrs] of facts.attributes) {
      const target = targetFor(attrs);
      if (!target) continue;
      addExperimentMetrics(target, {
        country: countryByUser.get(appUserId) ?? "unknown",
        users: 1,
      });
    }
  }

  for (const row of facts.installs) {
    const attrs = facts.attributes.get(row.appUserId);
    const target = targetFor(attrs);
    if (!target) continue;
    addExperimentMetrics(target, {
      country: row.country,
      installs: 1,
      completed: definition.showCompletion && isOnboardingComplete(attrs) ? 1 : 0,
      installsD7: row.installedAt + 7 * DAY_MS <= now ? 1 : 0,
      installsD14: row.installedAt + 14 * DAY_MS <= now ? 1 : 0,
      installsD30: row.installedAt + 30 * DAY_MS <= now ? 1 : 0,
    });
  }

  if (definition.includeSessions) {
    for (const row of facts.sessions) {
      const target = targetFor(facts.attributes.get(row.appUserId));
      if (!target) continue;
      addExperimentMetrics(target, {
        country: countryByUser.get(row.appUserId) ?? row.country,
        sessions: row.sessions,
      });
    }
  }

  const seenTrial = new Set<string>();
  const seenConverted = new Set<string>();
  const seenPaid = new Set<string>();
  for (const event of facts.events) {
    if (!event.appUserId || !inRange(event.installedAt, facts.startMs, facts.endMs)) continue;
    const target = targetFor(facts.attributes.get(event.appUserId));
    if (!target) continue;
    const country = event.country;
    const id = `${country}|${event.originalTransactionId}`;
    if (inRange(event.eventTs, facts.startMs, facts.endMs)) {
      addOutcomeMetrics(target, event, country, id, seenTrial, seenConverted, seenPaid);
    }
    if (event.netProceeds != null && isMobileMoneyEvent(event)) {
      const cohortStart = event.installedAt;
      addExperimentMetrics(target, {
        country,
        proceeds: event.netProceeds,
        proceedsD7: tenureProceeds(cohortStart, event.eventTs, now, 7, event.netProceeds),
        proceedsD14: tenureProceeds(cohortStart, event.eventTs, now, 14, event.netProceeds),
        proceedsD30: tenureProceeds(cohortStart, event.eventTs, now, 30, event.netProceeds),
      });
    }
  }

  if (definition.showRetention) {
    const byTxn = subscriptionStarts(facts.events, facts.startMs, facts.endMs);
    for (const row of byTxn.values()) {
      if (!row.appUserId) continue;
      const target = targetFor(facts.attributes.get(row.appUserId));
      if (!target) continue;
      addExperimentMetrics(target, {
        country: row.country,
        ...retentionMetrics(row.startedAt, row.expiresAt, now),
      });
    }
  }

  return {
    id: definition.id,
    title: definition.title,
    subtitle: definition.subtitle,
    scoreMetrics: definition.scoreMetrics,
    showRetention: definition.showRetention,
    showTrials: definition.showTrials,
    showCompletion: definition.showCompletion,
    showUsers: definition.showUsers,
    showSessions: definition.showSessions,
    showInstalls: definition.showInstalls,
    showPaid: definition.showPaid,
    showDownloadPaid: definition.showDownloadPaid,
    sessionDays: definition.includeSessions ? facts.sessionDays : undefined,
    variants,
  };
}

function addOutcomeMetrics(
  target: MobileAppExperimentVariant,
  event: AttributedRow,
  country: string,
  id: string,
  seenTrial: Set<string>,
  seenConverted: Set<string>,
  seenPaid: Set<string>,
) {
  if (event.name === "initial_purchase" && event.periodType === "trial" && !seenTrial.has(id)) {
    seenTrial.add(id);
    addExperimentMetrics(target, { country, trials: 1 });
  }
  if (event.name === "renewal" && event.isTrialConversion && !seenConverted.has(id)) {
    seenConverted.add(id);
    addExperimentMetrics(target, { country, converted: 1 });
  }
  if (isPaidEvent(event) && !seenPaid.has(id)) {
    seenPaid.add(id);
    addExperimentMetrics(target, { country, paid: 1 });
  }
}

function subscriptionStarts(events: AttributedRow[], startMs: number, endMs: number) {
  const byTxn = new Map<
    string,
    { appUserId: string; country: string; startedAt: number; expiresAt: number }
  >();
  for (const event of events) {
    if (!["initial_purchase", "renewal", "cancellation"].includes(event.name)) continue;
    const current = byTxn.get(event.originalTransactionId) ?? {
      appUserId: event.appUserId,
      country: event.country,
      startedAt: Number.POSITIVE_INFINITY,
      expiresAt: Number.NaN,
    };
    if (event.appUserId) current.appUserId = event.appUserId;
    if (event.name === "initial_purchase") current.startedAt = Math.min(current.startedAt, event.eventTs);
    if (Number.isFinite(event.expiresAt)) {
      current.expiresAt = Number.isFinite(current.expiresAt)
        ? Math.max(current.expiresAt, event.expiresAt)
        : event.expiresAt;
    }
    byTxn.set(event.originalTransactionId, current);
  }
  for (const [key, row] of byTxn) {
    if (row.startedAt < startMs || row.startedAt >= endMs) byTxn.delete(key);
  }
  return byTxn;
}

function retentionMetrics(startedAt: number, expiresAt: number, now: number) {
  const metrics: Partial<MobileAppExperimentSlice> = {};
  for (const [key, days] of [
    ["D7", 7],
    ["D14", 14],
    ["D30", 30],
  ] as const) {
    const checkpoint = startedAt + days * DAY_MS;
    if (checkpoint > now) continue;
    metrics[`eligible${key}`] = 1;
    metrics[`retained${key}`] = Number.isFinite(expiresAt) && expiresAt > checkpoint ? 1 : 0;
  }
  return metrics;
}

function tenureProceeds(
  cohortStart: number,
  eventTs: number,
  now: number,
  days: number,
  proceeds: number,
) {
  if (!Number.isFinite(cohortStart) || cohortStart + days * DAY_MS > now) return 0;
  return eventTs <= cohortStart + days * DAY_MS ? proceeds : 0;
}

function trialCancelFromFacts(facts: AppFacts): TrialCancelTiming {
  const buckets = TRIAL_CANCEL_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    cancels: 0,
    highlight: bucket.highlight,
  }));
  const byTxn = new Map<string, { trialStart: number; trialCancel: number }>();
  for (const event of facts.events) {
    if (event.periodType !== "trial") continue;
    const current = byTxn.get(event.originalTransactionId) ?? {
      trialStart: Number.POSITIVE_INFINITY,
      trialCancel: Number.NaN,
    };
    if (event.name === "initial_purchase") current.trialStart = Math.min(current.trialStart, event.eventTs);
    if (event.name === "cancellation") {
      current.trialCancel = Number.isFinite(current.trialCancel)
        ? Math.min(current.trialCancel, event.eventTs)
        : event.eventTs;
    }
    byTxn.set(event.originalTransactionId, current);
  }

  let trials = 0;
  let cancelled = 0;
  let cancelledBeforeQualified = 0;
  for (const row of byTxn.values()) {
    if (row.trialStart < facts.startMs || row.trialStart >= facts.endMs) continue;
    trials += 1;
    if (!Number.isFinite(row.trialCancel) || row.trialCancel <= row.trialStart) continue;
    const minutes = (row.trialCancel - row.trialStart) / 60_000;
    if (minutes >= 72 * 60) continue;
    cancelled += 1;
    if (minutes <= 15) cancelledBeforeQualified += 1;
    const index = TRIAL_CANCEL_BUCKETS.findIndex((bucket) => minutes < bucket.maxMinutes);
    if (index >= 0) buckets[index].cancels += 1;
  }
  return { trials, cancelled, cancelledBeforeQualified, buckets };
}

const TRIAL_CANCEL_BUCKETS: { key: string; label: string; maxMinutes: number; highlight?: boolean }[] = [
  { key: "0-5m", label: "0–5m", maxMinutes: 5 },
  { key: "5-10m", label: "5–10m", maxMinutes: 10 },
  { key: "10-15m", label: "10–15m", maxMinutes: 15, highlight: true },
  { key: "15-30m", label: "15–30m", maxMinutes: 30 },
  { key: "30-60m", label: "30–60m", maxMinutes: 60 },
  { key: "60-120m", label: "60–120m", maxMinutes: 120 },
  { key: "2-6h", label: "2–6h", maxMinutes: 6 * 60 },
  { key: "6-12h", label: "6–12h", maxMinutes: 12 * 60 },
  { key: "12-24h", label: "12–24h", maxMinutes: 24 * 60 },
  { key: "1-2d", label: "1–2d", maxMinutes: 48 * 60 },
  { key: "2-3d", label: "2–3d", maxMinutes: 72 * 60 },
];

function eventRepWindows(fromMs: number, toMs: number) {
  const windows: [string, string][] = [];
  let cursor = fromMs;
  while (cursor < toMs) {
    const next = Math.min(cursor + 7 * DAY_MS, toMs);
    // ClickHouse toDateTime64 rejects ISO `T`/`Z` timestamps.
    windows.push([clickhouseDate(new Date(cursor)), clickhouseDate(new Date(next))]);
    cursor = next;
  }
  return windows;
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
  for (const [key, days] of [
    ["d1", 1],
    ["d7", 7],
    ["d30", 30],
  ] as const) {
    const checkpoint = startedAt + days * DAY_MS;
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

function emptyExperimentVariant(key: string, label: string): MobileAppExperimentVariant {
  return { key, label, ...emptyExperimentSlice(), countries: {} };
}

function emptyExperimentSlice(): MobileAppExperimentSlice {
  return {
    users: 0,
    sessions: 0,
    installs: 0,
    completed: 0,
    trials: 0,
    converted: 0,
    paid: 0,
    proceeds: 0,
    installsD7: 0,
    proceedsD7: 0,
    eligibleD7: 0,
    retainedD7: 0,
    installsD14: 0,
    proceedsD14: 0,
    eligibleD14: 0,
    retainedD14: 0,
    installsD30: 0,
    proceedsD30: 0,
    eligibleD30: 0,
    retainedD30: 0,
  };
}

function addExperimentMetrics(
  target: MobileAppExperimentVariant,
  row: Partial<MobileAppExperimentSlice> & { country?: string },
) {
  const next = emptyExperimentSlice();
  for (const key of Object.keys(next) as (keyof MobileAppExperimentSlice)[]) {
    next[key] = Number(row[key] ?? 0);
  }
  target.users += next.users;
  target.sessions += next.sessions;
  target.installs += next.installs;
  target.completed += next.completed;
  target.trials += next.trials;
  target.converted += next.converted;
  target.paid += next.paid;
  target.proceeds = roundMoney(target.proceeds + next.proceeds);
  target.installsD7 += next.installsD7;
  target.proceedsD7 = roundMoney(target.proceedsD7 + next.proceedsD7);
  target.eligibleD7 += next.eligibleD7;
  target.retainedD7 += next.retainedD7;
  target.installsD14 += next.installsD14;
  target.proceedsD14 = roundMoney(target.proceedsD14 + next.proceedsD14);
  target.eligibleD14 += next.eligibleD14;
  target.retainedD14 += next.retainedD14;
  target.installsD30 += next.installsD30;
  target.proceedsD30 = roundMoney(target.proceedsD30 + next.proceedsD30);
  target.eligibleD30 += next.eligibleD30;
  target.retainedD30 += next.retainedD30;
  const country = normalizeCountry(row.country ?? "unknown");
  const bucket = target.countries[country] ?? emptyExperimentSlice();
  addExperimentMetricsToSlice(bucket, next);
  target.countries[country] = bucket;
}

function addExperimentMetricsToSlice(target: MobileAppExperimentSlice, next: MobileAppExperimentSlice) {
  target.users += next.users;
  target.sessions += next.sessions;
  target.installs += next.installs;
  target.completed += next.completed;
  target.trials += next.trials;
  target.converted += next.converted;
  target.paid += next.paid;
  target.proceeds = roundMoney(target.proceeds + next.proceeds);
  target.installsD7 += next.installsD7;
  target.proceedsD7 = roundMoney(target.proceedsD7 + next.proceedsD7);
  target.eligibleD7 += next.eligibleD7;
  target.retainedD7 += next.retainedD7;
  target.installsD14 += next.installsD14;
  target.proceedsD14 = roundMoney(target.proceedsD14 + next.proceedsD14);
  target.eligibleD14 += next.eligibleD14;
  target.retainedD14 += next.retainedD14;
  target.installsD30 += next.installsD30;
  target.proceedsD30 = roundMoney(target.proceedsD30 + next.proceedsD30);
  target.eligibleD30 += next.eligibleD30;
  target.retainedD30 += next.retainedD30;
}

function paywallVariantForVersion(value: string): "native" | "legacy" | null {
  const version = parseAppVersion(value);
  if (!version) return null;
  for (let index = 0; index < GLOW_NATIVE_PAYWALL_MIN_VERSION.length; index += 1) {
    if (version[index] > GLOW_NATIVE_PAYWALL_MIN_VERSION[index]) return "native";
    if (version[index] < GLOW_NATIVE_PAYWALL_MIN_VERSION[index]) return "legacy";
  }
  return "native";
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function parseAppVersion(value: string): [number, number, number] | null {
  const match = value.trim().match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}

function isPaidEvent(event: AttributedRow) {
  return (
    (event.name === "initial_purchase" && event.periodType !== "trial") ||
    (event.name === "renewal" && event.isTrialConversion)
  );
}

function isOnboardingComplete(attrs: Record<string, string> | undefined) {
  const value = attrs?.widget_screen_seen;
  return value === "true" || value === "1";
}

function inRange(value: number, startMs: number, endMs: number) {
  return Number.isFinite(value) && value >= startMs && value < endMs;
}

function mergeTrend(
  downloads: { bucket: Date; downloads: number }[],
  revenue: { bucket: Date; revenue: number }[],
  paid: { bucket: Date; paid: number }[],
): MobileAppTrendPoint[] {
  const points = new Map<number, MobileAppTrendPoint>();
  for (const row of downloads) {
    points.set(row.bucket.getTime(), { bucket: row.bucket, downloads: row.downloads, revenue: 0, paid: 0 });
  }
  for (const row of revenue) {
    const timestamp = row.bucket.getTime();
    const point = points.get(timestamp) ?? { bucket: row.bucket, downloads: 0, revenue: 0, paid: 0 };
    point.revenue += row.revenue;
    points.set(timestamp, point);
  }
  for (const row of paid) {
    const timestamp = row.bucket.getTime();
    const point = points.get(timestamp) ?? { bucket: row.bucket, downloads: 0, revenue: 0, paid: 0 };
    point.paid += row.paid;
    points.set(timestamp, point);
  }
  return [...points.values()].sort((a, b) => a.bucket.getTime() - b.bucket.getTime());
}

function paidTrendFromFacts(facts: AppFacts, period: Period) {
  const firstPaidByTransaction = new Map<string, number>();
  for (const event of facts.events) {
    if (event.eventTs < facts.startMs || event.eventTs >= facts.endMs || !isPaidEvent(event)) continue;
    const id = `${event.country}|${event.originalTransactionId}`;
    const current = firstPaidByTransaction.get(id);
    if (current === undefined || event.eventTs < current) firstPaidByTransaction.set(id, event.eventTs);
  }

  const points = new Map<number, { bucket: Date; paid: number }>();
  for (const timestamp of firstPaidByTransaction.values()) {
    const bucket = trendBucket(new Date(timestamp), period);
    const key = bucket.getTime();
    const point = points.get(key) ?? { bucket, paid: 0 };
    point.paid += 1;
    points.set(key, point);
  }
  return [...points.values()];
}

function clickhouseDate(date: Date) {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

function parseClickhouseDate(value: string) {
  return new Date(`${value.replace(" ", "T")}Z`);
}

function parseTs(value: string | null | undefined) {
  if (!value) return Number.NaN;
  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;
  const normalized = trimmed.includes("T") ? trimmed : `${trimmed.replace(" ", "T")}Z`;
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : Number.NaN;
}

function normalizeCountry(value: string) {
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "unknown";
}

function logAnalytics(event: string, extra: Record<string, unknown>) {
  const log = process.env.NODE_ENV === "development" ? console.warn : console.error;
  log(event, extra);
}

async function querySuperwall<T>(sql: string, organizationId: number, apiKey: string): Promise<T[]> {
  const url = `https://api.superwall.com/v2/organizations/${organizationId}/query`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await acquireQuerySlot();
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
    } finally {
      releaseQuerySlot();
    }
  }

  throw lastError ?? new Error("Superwall query failed");
}

function acquireQuerySlot() {
  if (activeQueries < MAX_QUERY_CONCURRENCY) {
    activeQueries += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    queryWaiters.push(() => {
      activeQueries += 1;
      resolve();
    });
  });
}

function releaseQuerySlot() {
  activeQueries = Math.max(0, activeQueries - 1);
  const next = queryWaiters.shift();
  if (next) next();
}
