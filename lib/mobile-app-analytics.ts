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

export type MobileAppExperimentSlice = {
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

export type MobileAppExperimentScoreMetric = "appu" | "download_paid" | "appu_d7" | "appu_d14" | "appu_d30";

export type MobileAppExperiment = {
  id: string;
  title: string;
  subtitle: string;
  variants: MobileAppExperimentVariant[];
  scoreMetrics?: MobileAppExperimentScoreMetric[];
  showCompletion?: boolean;
  showTrials?: boolean;
  showRetention?: boolean;
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
};

const SUPERWALL_ORGANIZATION_ID = 16256;
const POKY_APPLICATION_ID = 49771;
const VERSY_SUPERWALL_ORGANIZATION_ID = 25476;
const VERSY_SUPERWALL_APPLICATION_ID = 51393;
const GLOW_SUPERWALL_ORGANIZATION_ID = 27020;
const GLOW_SUPERWALL_APPLICATION_ID = 54736;
const ALL_TIME_START = new Date("2024-01-01T00:00:00.000Z");
const GLOW_NATIVE_PAYWALL_MIN_VERSION = [1, 7, 0] as const;
const POKY_RECOVERY_STARTED_AT = "2026-09-18T16:04:58.000Z";
const POKY_RECOVERY_TREATMENT_VARIANTS = new Set(["611637", "611646", "611649", "611652"]);
const POKY_RECOVERY_HOLDOUT_VARIANTS = new Set(["635510", "635511", "635512", "635513"]);

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
  const includePlanCards = includeCountries && app.id !== "glow";
  const plans = includePlanCards ? await getSuperwallPlanBreakdown(app, start, end).catch(() => []) : [];
  const retention = includePlanCards ? await getSuperwallRetentionBreakdown(app, start, end).catch(() => []) : [];
  const experiments = includeCountries
    ? app.id === "glow"
      ? (
          await Promise.all([
            getGlowPaywallExperiment(app, start, end).catch(() => []),
            getGlowYearlyPriceExperiment(app, start, end).catch(() => []),
            getGlowOnboardingExperiment(app, start, end).catch(() => []),
          ])
        ).flat()
      : app.id === "poky"
        ? await getPokyExperiments(app, start, end).catch(() => [])
        : []
    : [];
  const trialCancelTiming =
    includeCountries && app.id === "glow"
      ? await getGlowTrialCancelTiming(app, start, end).catch(() => null)
      : null;
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
    experiments,
    trialCancelTiming,
  };
}

async function getGlowPaywallExperiment(
  app: SuperwallAppConfig,
  start: string,
  end: string,
): Promise<MobileAppExperiment[]> {
  const installsQuery = `
    SELECT ver AS appVersion, country, uniq(appUserId) AS installs
    FROM (
      SELECT
        appUserId,
        argMin(JSONExtractString(meta, 'appVersion'), ts) AS ver,
        argMin(upper(ifNull(nullIf(JSONExtractString(headers, 'Cf-Ipcountry'), ''), 'unknown')), ts) AS country
      FROM sw.demand_score_events_rep
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND name = 'device_attributes'
        AND appInstallDate >= toDateTime64('${start}', 6, 'UTC')
        AND appInstallDate < toDateTime64('${end}', 6, 'UTC')
        AND ts >= toDateTime64('${start}', 6, 'UTC')
        AND ts < now()
      GROUP BY appUserId
    )
    WHERE ver != ''
    GROUP BY ver, country
    FORMAT JSON
  `;
  const outcomesQuery = `
    SELECT
      ifNull(appVersion, '') AS appVersion,
      ifNull(nullIf(countryCode, ''), 'unknown') AS country,
      uniqIf(originalTransactionId, name = 'initial_purchase' AND lower(ifNull(periodType, '')) = 'trial') AS trials,
      uniqIf(originalTransactionId, name = 'renewal' AND isTrialConversion = 1) AS converted,
      uniqIf(
        originalTransactionId,
        (name = 'initial_purchase' AND lower(ifNull(periodType, '')) != 'trial')
        OR (name = 'renewal' AND isTrialConversion = 1)
      ) AS paid
    FROM open_revenue.attributed_events_by_ts_rep FINAL
    WHERE applicationId = ${app.applicationId}
      AND isSandbox = 0
      AND source = 'integration'
      AND isFamilyShare = 0
      AND installDate >= toDateTime64('${start}', 6, 'UTC')
      AND installDate < toDateTime64('${end}', 6, 'UTC')
      AND ts >= toDateTime64('${start}', 6, 'UTC')
      AND ts < toDateTime64('${end}', 6, 'UTC')
      AND ts < now()
      AND ifNull(appVersion, '') != ''
    GROUP BY appVersion, country
    FORMAT JSON
  `;
  const proceedsQuery = `
    SELECT appVersion, country, round(sum(net_proceeds), 2) AS proceeds
    FROM (
      SELECT
        ifNull(appVersion, '') AS appVersion,
        ifNull(nullIf(countryCode, ''), 'unknown') AS country,
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
        AND installDate >= toDateTime64('${start}', 6, 'UTC')
        AND installDate < toDateTime64('${end}', 6, 'UTC')
        AND ts >= toDateTime64('${start}', 6, 'UTC')
        AND ts < toDateTime64('${end}', 6, 'UTC')
        AND ts < now()
        AND ifNull(appVersion, '') != ''
      GROUP BY appVersion, country, name, originalTransactionId, transactionId
    )
    GROUP BY appVersion, country
    FORMAT JSON
  `;

  const [installResult, outcomeResult, proceedResult] = await Promise.allSettled([
    querySuperwall<{ appVersion: string; country: string; installs: string | number }>(
      installsQuery,
      app.organizationId,
      app.apiKey,
    ),
    querySuperwall<{
      appVersion: string;
      country: string;
      trials: string | number;
      converted: string | number;
      paid: string | number;
    }>(outcomesQuery, app.organizationId, app.apiKey),
    querySuperwall<{ appVersion: string; country: string; proceeds: string | number | null }>(
      proceedsQuery,
      app.organizationId,
      app.apiKey,
    ),
  ]);

  const failed = [installResult, outcomeResult, proceedResult].find((result) => result.status === "rejected");
  if (failed && failed.status === "rejected") {
    const log = process.env.NODE_ENV === "development" ? console.warn : console.error;
    log("tap_and_swipe.glow_paywall_experiment_partial", {
      error: failed.reason instanceof Error ? failed.reason.message : String(failed.reason),
    });
  }

  return [
    mergePaywallExperiment(
      installResult.status === "fulfilled"
        ? installResult.value.map((row) => ({
            appVersion: row.appVersion,
            country: row.country,
            installs: Number(row.installs),
          }))
        : [],
      outcomeResult.status === "fulfilled"
        ? outcomeResult.value.map((row) => ({
            appVersion: row.appVersion,
            country: row.country,
            trials: Number(row.trials),
            converted: Number(row.converted),
            paid: Number(row.paid),
          }))
        : [],
      proceedResult.status === "fulfilled"
        ? proceedResult.value.map((row) => ({
            appVersion: row.appVersion,
            country: row.country,
            proceeds: Number(row.proceeds ?? 0),
          }))
        : [],
    ),
  ];
}

function mergePaywallExperiment(
  installs: { appVersion: string; country: string; installs: number }[],
  outcomes: { appVersion: string; country: string; trials: number; converted: number; paid: number }[],
  proceeds: { appVersion: string; country: string; proceeds: number }[],
): MobileAppExperiment {
  const legacy = emptyExperimentVariant("legacy", "Superwall web");
  const native = emptyExperimentVariant("native", "Native paywall");
  const targetFor = (appVersion: string) => {
    const variant = paywallVariantForVersion(appVersion);
    if (variant === "native") return native;
    if (variant === "legacy") return legacy;
    return null;
  };

  for (const row of installs) {
    const target = targetFor(row.appVersion);
    if (target) addExperimentMetrics(target, row);
  }
  for (const row of outcomes) {
    const target = targetFor(row.appVersion);
    if (target) addExperimentMetrics(target, row);
  }
  for (const row of proceeds) {
    const target = targetFor(row.appVersion);
    if (target) addExperimentMetrics(target, row);
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

async function getGlowOnboardingExperiment(
  app: SuperwallAppConfig,
  start: string,
  end: string,
): Promise<MobileAppExperiment[]> {
  const installsQuery = `
    SELECT lower(v.value) AS variant, i.country AS country, uniq(i.appUserId) AS installs
    FROM (
      SELECT
        appUserId,
        argMin(upper(ifNull(nullIf(JSONExtractString(headers, 'Cf-Ipcountry'), ''), 'unknown')), ts) AS country
      FROM sw.demand_score_events_rep
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND name = 'device_attributes'
        AND appInstallDate >= toDateTime64('${start}', 6, 'UTC')
        AND appInstallDate < toDateTime64('${end}', 6, 'UTC')
        AND ts >= toDateTime64('${start}', 6, 'UTC')
        AND ts < now()
      GROUP BY appUserId
    ) i
    INNER JOIN (
      SELECT appUserId, value
      FROM sw.user_attributes_rep FINAL
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND isDeleted = 0
        AND ts < now()
        AND key = 'onboarding_variant'
        AND lower(value) IN ('iam', 'copy')
    ) v ON i.appUserId = v.appUserId
    GROUP BY variant, country
    FORMAT JSON
  `;
  const outcomesQuery = `
    SELECT
      lower(v.value) AS variant,
      e.country AS country,
      uniqIf(e.originalTransactionId, e.name = 'initial_purchase' AND lower(ifNull(e.periodType, '')) = 'trial') AS trials,
      uniqIf(e.originalTransactionId, e.name = 'renewal' AND e.isTrialConversion = 1) AS converted,
      uniqIf(
        e.originalTransactionId,
        (e.name = 'initial_purchase' AND lower(ifNull(e.periodType, '')) != 'trial')
        OR (e.name = 'renewal' AND e.isTrialConversion = 1)
      ) AS paid
    FROM (
      SELECT
        appUserId,
        name,
        periodType,
        isTrialConversion,
        originalTransactionId,
        ifNull(nullIf(countryCode, ''), 'unknown') AS country
      FROM open_revenue.attributed_events_by_ts_rep FINAL
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND source = 'integration'
        AND isFamilyShare = 0
        AND installDate >= toDateTime64('${start}', 6, 'UTC')
        AND installDate < toDateTime64('${end}', 6, 'UTC')
        AND ts >= toDateTime64('${start}', 6, 'UTC')
        AND ts < toDateTime64('${end}', 6, 'UTC')
        AND ts < now()
    ) e
    INNER JOIN (
      SELECT appUserId, value
      FROM sw.user_attributes_rep FINAL
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND isDeleted = 0
        AND ts < now()
        AND key = 'onboarding_variant'
        AND lower(value) IN ('iam', 'copy')
    ) v ON e.appUserId = v.appUserId
    GROUP BY variant, country
    FORMAT JSON
  `;
  const proceedsQuery = `
    SELECT variant, country, round(sum(net_proceeds), 2) AS proceeds
    FROM (
      SELECT
        lower(v.value) AS variant,
        e.country AS country,
        e.name,
        e.originalTransactionId,
        e.transactionId,
        if(
          argMax(e.isRefund, e.attributionTs) = 1,
          -abs(toFloat64(argMax(e.proceeds, e.attributionTs))),
          toFloat64(argMax(e.proceeds, e.attributionTs))
        ) AS net_proceeds
      FROM (
        SELECT
          appUserId,
          name,
          originalTransactionId,
          transactionId,
          isRefund,
          attributionTs,
          proceeds,
          ifNull(nullIf(countryCode, ''), 'unknown') AS country
        FROM open_revenue.attributed_events_by_ts_rep FINAL
        WHERE applicationId = ${app.applicationId}
          AND isSandbox = 0
          AND source = 'integration'
          AND name IN ('initial_purchase', 'renewal', 'non_renewing_purchase')
          AND isFamilyShare = 0
          AND proceeds IS NOT NULL
          AND installDate >= toDateTime64('${start}', 6, 'UTC')
          AND installDate < toDateTime64('${end}', 6, 'UTC')
          AND ts >= toDateTime64('${start}', 6, 'UTC')
          AND ts < toDateTime64('${end}', 6, 'UTC')
          AND ts < now()
      ) e
      INNER JOIN (
        SELECT appUserId, value
        FROM sw.user_attributes_rep FINAL
        WHERE applicationId = ${app.applicationId}
          AND isSandbox = 0
          AND isDeleted = 0
          AND ts < now()
          AND key = 'onboarding_variant'
          AND lower(value) IN ('iam', 'copy')
      ) v ON e.appUserId = v.appUserId
      GROUP BY variant, country, e.name, e.originalTransactionId, e.transactionId
    )
    GROUP BY variant, country
    FORMAT JSON
  `;
  const completedQuery = `
    SELECT lower(v.value) AS variant, i.country AS country, uniq(i.appUserId) AS completed
    FROM (
      SELECT
        appUserId,
        argMin(upper(ifNull(nullIf(JSONExtractString(headers, 'Cf-Ipcountry'), ''), 'unknown')), ts) AS country
      FROM sw.demand_score_events_rep
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND name = 'device_attributes'
        AND appInstallDate >= toDateTime64('${start}', 6, 'UTC')
        AND appInstallDate < toDateTime64('${end}', 6, 'UTC')
        AND ts >= toDateTime64('${start}', 6, 'UTC')
        AND ts < now()
      GROUP BY appUserId
    ) i
    INNER JOIN (
      SELECT appUserId, value
      FROM sw.user_attributes_rep FINAL
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND isDeleted = 0
        AND ts < now()
        AND key = 'onboarding_variant'
        AND lower(value) IN ('iam', 'copy')
    ) v ON i.appUserId = v.appUserId
    INNER JOIN (
      SELECT appUserId
      FROM sw.user_attributes_rep FINAL
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND isDeleted = 0
        AND ts < now()
        AND key = 'widget_screen_seen'
        AND lower(value) IN ('true', '1')
    ) c ON i.appUserId = c.appUserId
    GROUP BY variant, country
    FORMAT JSON
  `;

  const [installResult, outcomeResult, proceedResult, completedResult] = await Promise.allSettled([
    querySuperwall<{ variant: string; country: string; installs: string | number }>(
      installsQuery,
      app.organizationId,
      app.apiKey,
    ),
    querySuperwall<{
      variant: string;
      country: string;
      trials: string | number;
      converted: string | number;
      paid: string | number;
    }>(outcomesQuery, app.organizationId, app.apiKey),
    querySuperwall<{ variant: string; country: string; proceeds: string | number | null }>(
      proceedsQuery,
      app.organizationId,
      app.apiKey,
    ),
    querySuperwall<{ variant: string; country: string; completed: string | number }>(
      completedQuery,
      app.organizationId,
      app.apiKey,
    ),
  ]);

  const failed = [installResult, outcomeResult, proceedResult, completedResult].find((result) => result.status === "rejected");
  if (failed && failed.status === "rejected") {
    const log = process.env.NODE_ENV === "development" ? console.warn : console.error;
    log("tap_and_swipe.glow_onboarding_experiment_partial", {
      error: failed.reason instanceof Error ? failed.reason.message : String(failed.reason),
    });
  }

  return [
    mergeOnboardingExperiment(
      installResult.status === "fulfilled"
        ? installResult.value.map((row) => ({
            variant: row.variant,
            country: row.country,
            installs: Number(row.installs),
          }))
        : [],
      outcomeResult.status === "fulfilled"
        ? outcomeResult.value.map((row) => ({
            variant: row.variant,
            country: row.country,
            trials: Number(row.trials),
            converted: Number(row.converted),
            paid: Number(row.paid),
          }))
        : [],
      proceedResult.status === "fulfilled"
        ? proceedResult.value.map((row) => ({
            variant: row.variant,
            country: row.country,
            proceeds: Number(row.proceeds ?? 0),
          }))
        : [],
      completedResult.status === "fulfilled"
        ? completedResult.value.map((row) => ({
            variant: row.variant,
            country: row.country,
            completed: Number(row.completed),
          }))
        : [],
    ),
  ];
}

function mergeOnboardingExperiment(
  installs: { variant: string; country: string; installs: number }[],
  outcomes: { variant: string; country: string; trials: number; converted: number; paid: number }[],
  proceeds: { variant: string; country: string; proceeds: number }[],
  completed: { variant: string; country: string; completed: number }[],
): MobileAppExperiment {
  const iam = emptyExperimentVariant("iam", "IAM");
  const copy = emptyExperimentVariant("copy", "Copy");
  const targetFor = (value: string) => {
    const variant = value.trim().toLowerCase();
    if (variant === "iam") return iam;
    if (variant === "copy") return copy;
    return null;
  };

  for (const row of installs) {
    const target = targetFor(row.variant);
    if (target) addExperimentMetrics(target, row);
  }
  for (const row of outcomes) {
    const target = targetFor(row.variant);
    if (target) addExperimentMetrics(target, row);
  }
  for (const row of proceeds) {
    const target = targetFor(row.variant);
    if (target) addExperimentMetrics(target, row);
  }
  for (const row of completed) {
    const target = targetFor(row.variant);
    if (target) addExperimentMetrics(target, row);
  }

  return {
    id: "glow-onboarding-copy",
    title: "Onboarding A/B test",
    subtitle: "IAM vs Copy",
    scoreMetrics: ["appu", "download_paid"],
    showCompletion: true,
    showTrials: true,
    variants: [iam, copy],
  };
}

async function getGlowYearlyPriceExperiment(
  app: SuperwallAppConfig,
  start: string,
  end: string,
): Promise<MobileAppExperiment[]> {
  return [
    await getAttributeExperiment(app, start, end, {
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
  ];
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

async function getGlowTrialCancelTiming(
  app: SuperwallAppConfig,
  start: string,
  end: string,
): Promise<TrialCancelTiming> {
  const rows = await querySuperwall<{
    orig: string;
    trialStart: string;
    trialCancel: string | null;
  }>(
    `
SELECT orig, trialStart, trialCancel
FROM (
  SELECT
    originalTransactionId AS orig,
    minIf(ts, name = 'initial_purchase' AND lower(ifNull(periodType, '')) = 'trial') AS trialStart,
    minIf(ts, name = 'cancellation' AND lower(ifNull(periodType, '')) = 'trial') AS trialCancel
  FROM open_revenue.attributed_events_by_ts_rep FINAL
  WHERE applicationId = ${app.applicationId}
    AND isSandbox = 0
    AND source = 'integration'
    AND isFamilyShare = 0
    AND name IN ('initial_purchase', 'cancellation')
    AND ts >= toDateTime64('${start}', 6, 'UTC')
    AND ts < now()
  GROUP BY originalTransactionId
)
WHERE trialStart >= toDateTime64('${start}', 6, 'UTC')
  AND trialStart < toDateTime64('${end}', 6, 'UTC')
LIMIT 20000
FORMAT JSON
`.trim(),
    app.organizationId,
    app.apiKey,
  );

  const buckets = TRIAL_CANCEL_BUCKETS.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    cancels: 0,
    highlight: bucket.highlight,
  }));
  let trials = 0;
  let cancelled = 0;
  let cancelledBeforeQualified = 0;
  for (const row of rows) {
    const startedAt = Date.parse(row.trialStart);
    if (!Number.isFinite(startedAt)) continue;
    trials += 1;
    const cancelledAt = row.trialCancel ? Date.parse(row.trialCancel) : Number.NaN;
    if (!Number.isFinite(cancelledAt) || cancelledAt <= startedAt) continue;
    const minutes = (cancelledAt - startedAt) / 60_000;
    if (minutes >= 72 * 60) continue;
    cancelled += 1;
    if (minutes <= 15) cancelledBeforeQualified += 1;
    const index = TRIAL_CANCEL_BUCKETS.findIndex((bucket) => minutes < bucket.maxMinutes);
    if (index >= 0) buckets[index].cancels += 1;
  }

  return { trials, cancelled, cancelledBeforeQualified, buckets };
}

async function getPokyExperiments(
  app: SuperwallAppConfig,
  start: string,
  end: string,
): Promise<MobileAppExperiment[]> {
  const results = await Promise.all([
    getPokyRecoveryExperiment(app, start, end).catch(() => null),
    getAttributeExperiment(app, start, end, {
      id: "poky-animated-plan",
      title: "Animated plan A/B test",
      subtitle: "Control vs Animated plan",
      attributeKeys: ["onboarding_plan_variant"],
      variants: [
        { key: "control", label: "Control", attributes: { onboarding_plan_variant: "control" } },
        { key: "animated_plan", label: "Animated plan", attributes: { onboarding_plan_variant: "animated_plan" } },
      ],
      scoreMetrics: ["appu_d7", "appu_d14", "appu_d30"],
      showRetention: true,
    }).catch(() => null),
    getAttributeExperiment(app, start, end, {
      id: "poky-app-experience",
      title: "App experience A/B test",
      subtitle: "Original vs AI Chat",
      attributeKeys: ["home_experience_variant"],
      variants: [
        { key: "control", label: "Original", attributes: { home_experience_variant: "control" } },
        { key: "new_experience", label: "AI Chat", attributes: { home_experience_variant: "new_experience" } },
      ],
      scoreMetrics: ["appu_d7", "appu_d14", "appu_d30"],
      showRetention: true,
    }).catch(() => null),
    getAttributeExperiment(app, start, end, {
      id: "poky-onboarding-abcd",
      title: "Onboarding A/B/C/D test",
      subtitle: "Extra animation × AI Chat",
      attributeKeys: ["onboarding_plan_variant", "home_experience_variant"],
      variants: [
        {
          key: "extra_original",
          label: "Extra animation + original",
          attributes: { onboarding_plan_variant: "control", home_experience_variant: "control" },
        },
        {
          key: "extra_chat",
          label: "Extra animation + AI chat",
          attributes: { onboarding_plan_variant: "control", home_experience_variant: "new_experience" },
        },
        {
          key: "intro_original",
          label: "Animated intro + original",
          attributes: { onboarding_plan_variant: "animated_plan", home_experience_variant: "control" },
        },
        {
          key: "intro_chat",
          label: "Animated intro + AI chat",
          attributes: { onboarding_plan_variant: "animated_plan", home_experience_variant: "new_experience" },
        },
      ],
      scoreMetrics: ["appu_d7", "appu_d14", "appu_d30"],
      showRetention: true,
    }).catch(() => null),
  ]);
  return results.filter((experiment): experiment is MobileAppExperiment => experiment != null);
}

async function getPokyRecoveryExperiment(
  app: SuperwallAppConfig,
  start: string,
  end: string,
): Promise<MobileAppExperiment> {
  const assigned = await getPokyRecoveryAssignments(app, start, end);
  const recovery = emptyExperimentVariant("recovery", "Recovery paywall");
  const none = emptyExperimentVariant("none", "None");
  const byUser = new Map<string, { arm: "recovery" | "none"; country: string; assignedAt: number }>();
  for (const row of assigned) {
    const arm = recoveryArmForTrigger(row.variantId, row.result);
    if (!arm) continue;
    const assignedAt = Date.parse(row.ts);
    if (!Number.isFinite(assignedAt)) continue;
    const current = byUser.get(row.appUserId);
    if (current && current.assignedAt <= assignedAt) continue;
    byUser.set(row.appUserId, { arm, country: normalizeCountry(row.country), assignedAt });
  }

  for (const row of byUser.values()) {
    const target = row.arm === "none" ? none : recovery;
    const now = Date.now();
    addExperimentMetrics(target, {
      country: row.country,
      installs: 1,
      installsD7: row.assignedAt + 7 * 86_400_000 <= now ? 1 : 0,
      installsD14: row.assignedAt + 14 * 86_400_000 <= now ? 1 : 0,
      installsD30: row.assignedAt + 30 * 86_400_000 <= now ? 1 : 0,
    });
  }

  const [proceedResult, retentionResult] = await Promise.allSettled([
    querySuperwall<{
      appUserId: string | null;
      country: string;
      eventTs: string;
      net_proceeds: string | number | null;
    }>(pokyRecoveryProceedsQuery(app, start, end), app.organizationId, app.apiKey),
    querySuperwall<{
      appUserId: string | null;
      country: string;
      startedAt: string;
      expiresAt: string | null;
    }>(pokyRecoveryRetentionQuery(app, start, end), app.organizationId, app.apiKey),
  ]);

  if (proceedResult.status === "fulfilled") {
    const paidUsers = new Set<string>();
    for (const row of proceedResult.value) {
      if (!row.appUserId) continue;
      const assignment = byUser.get(row.appUserId);
      if (!assignment) continue;
      const eventTs = Date.parse(row.eventTs);
      const proceeds = Number(row.net_proceeds ?? 0);
      if (!Number.isFinite(eventTs) || eventTs < assignment.assignedAt) continue;
      const target = assignment.arm === "none" ? none : recovery;
      const now = Date.now();
      const firstPaid = proceeds > 0 && !paidUsers.has(row.appUserId);
      if (firstPaid) paidUsers.add(row.appUserId);
      addExperimentMetrics(target, {
        country: assignment.country,
        proceeds,
        paid: firstPaid ? 1 : 0,
        proceedsD7:
          assignment.assignedAt + 7 * 86_400_000 <= now && eventTs <= assignment.assignedAt + 7 * 86_400_000
            ? proceeds
            : 0,
        proceedsD14:
          assignment.assignedAt + 14 * 86_400_000 <= now && eventTs <= assignment.assignedAt + 14 * 86_400_000
            ? proceeds
            : 0,
        proceedsD30:
          assignment.assignedAt + 30 * 86_400_000 <= now && eventTs <= assignment.assignedAt + 30 * 86_400_000
            ? proceeds
            : 0,
      });
    }
  }

  if (retentionResult.status === "fulfilled") {
    const now = Date.now();
    for (const row of retentionResult.value) {
      if (!row.appUserId) continue;
      const assignment = byUser.get(row.appUserId);
      if (!assignment) continue;
      const startedAt = Date.parse(row.startedAt);
      if (!Number.isFinite(startedAt) || startedAt < assignment.assignedAt) continue;
      const expiresAt = row.expiresAt ? Date.parse(row.expiresAt) : Number.NaN;
      const metrics: Partial<MobileAppExperimentSlice> = {};
      for (const [key, days] of [
        ["D7", 7],
        ["D14", 14],
        ["D30", 30],
      ] as const) {
        const checkpoint = startedAt + days * 86_400_000;
        if (checkpoint > now) continue;
        metrics[`eligible${key}`] = 1;
        metrics[`retained${key}`] = Number.isFinite(expiresAt) && expiresAt > checkpoint ? 1 : 0;
      }
      addExperimentMetrics(assignment.arm === "none" ? none : recovery, {
        country: assignment.country,
        ...metrics,
      });
    }
  }

  return {
    id: "poky-recovery-holdout",
    title: "Recovery A/B test",
    subtitle: "Recovery paywall vs none",
    scoreMetrics: ["appu_d7", "appu_d14", "appu_d30"],
    showRetention: true,
    variants: [none, recovery],
  };
}

function recoveryArmForTrigger(variantId: string, result: string): "recovery" | "none" | null {
  if (POKY_RECOVERY_HOLDOUT_VARIANTS.has(variantId) || result === "holdout") return "none";
  if (POKY_RECOVERY_TREATMENT_VARIANTS.has(variantId) && (result === "present" || result === "")) return "recovery";
  return null;
}

async function getPokyRecoveryAssignments(
  app: SuperwallAppConfig,
  start: string,
  end: string,
) {
  const from = Math.max(Date.parse(start), Date.parse(POKY_RECOVERY_STARTED_AT));
  const to = Math.min(Date.parse(end), Date.now());
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return [];
  const windows = eventRepWindows(from, to);
  const chunks = await Promise.allSettled(
    windows.map(([winStart, winEnd]) =>
      querySuperwall<{
        appUserId: string;
        result: string;
        variantId: string;
        country: string;
        ts: string;
      }>(
        `
SELECT
  appUserId,
  JSONExtractString(props, '$result') AS result,
  JSONExtractString(props, '$variant_id') AS variantId,
  upper(ifNull(nullIf(JSONExtractString(headers, 'Cf-Ipcountry'), ''), 'unknown')) AS country,
  ts
FROM sw.events_rep
WHERE applicationId = ${app.applicationId}
  AND isSandbox = 0
  AND name = 'trigger_fire'
  AND ts > toStartOfHour(toDateTime64('${winStart}', 6, 'UTC'))
  AND ts < toDateTime64('${winEnd}', 6, 'UTC')
  AND ts < now()
  AND JSONExtractString(props, '$trigger_name') IN ('transaction_abandon', 'paywall_decline')
LIMIT 20000
FORMAT JSON
`.trim(),
        app.organizationId,
        app.apiKey,
      ),
    ),
  );
  return chunks.flatMap((chunk) => (chunk.status === "fulfilled" ? chunk.value : []));
}

function eventRepWindows(fromMs: number, toMs: number) {
  const windows: [string, string][] = [];
  let cursor = fromMs;
  while (cursor < toMs) {
    const next = Math.min(cursor + 7 * 86_400_000, toMs);
    windows.push([new Date(cursor).toISOString(), new Date(next).toISOString()]);
    cursor = next;
  }
  return windows;
}

function pokyRecoveryProceedsQuery(app: SuperwallAppConfig, start: string, end: string) {
  return `
    SELECT
      appUserId,
      country,
      eventTs,
      net_proceeds
    FROM (
      SELECT
        appUserId,
        ifNull(nullIf(countryCode, ''), 'unknown') AS country,
        name,
        originalTransactionId,
        transactionId,
        argMax(ts, attributionTs) AS eventTs,
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
        AND ts >= toDateTime64('${POKY_RECOVERY_STARTED_AT}', 6, 'UTC')
        AND ts < toDateTime64('${end}', 6, 'UTC')
        AND ts < now()
      GROUP BY appUserId, country, name, originalTransactionId, transactionId
    )
    FORMAT JSON
  `;
}

function pokyRecoveryRetentionQuery(app: SuperwallAppConfig, start: string, end: string) {
  return `
    SELECT
      any(appUserId) AS appUserId,
      ifNull(nullIf(any(countryCode), ''), 'unknown') AS country,
      minIf(ts, name = 'initial_purchase') AS startedAt,
      max(expirationAt) AS expiresAt
    FROM open_revenue.attributed_events_by_ts_rep FINAL
    WHERE applicationId = ${app.applicationId}
      AND isSandbox = 0
      AND source = 'integration'
      AND isFamilyShare = 0
      AND name IN ('initial_purchase', 'renewal', 'cancellation')
      AND ts >= toDateTime64('${POKY_RECOVERY_STARTED_AT}', 6, 'UTC')
      AND ts < now()
    GROUP BY originalTransactionId
    HAVING startedAt >= toDateTime64('${POKY_RECOVERY_STARTED_AT}', 6, 'UTC')
      AND startedAt < toDateTime64('${end}', 6, 'UTC')
    LIMIT 20000
    FORMAT JSON
  `;
}

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
};

async function getAttributeExperiment(
  app: SuperwallAppConfig,
  start: string,
  end: string,
  definition: AttributeExperimentDefinition,
): Promise<MobileAppExperiment> {
  const attrSelect = definition.attributeKeys.map((key, index) => `${attributeAlias(index)}.value AS ${key}`).join(",\n      ");
  const attrGroup = definition.attributeKeys.join(", ");
  const joins = (leftAlias: string) =>
    definition.attributeKeys
      .map((key, index) => userAttributeJoin(app, attributeAlias(index), key, leftAlias))
      .join("\n");

  const installsQuery = `
    SELECT
      ${attrSelect},
      i.country AS country,
      uniq(i.appUserId) AS installs,
      uniqIf(i.appUserId, i.installedAt <= now() - INTERVAL 7 DAY) AS installsD7,
      uniqIf(i.appUserId, i.installedAt <= now() - INTERVAL 14 DAY) AS installsD14,
      uniqIf(i.appUserId, i.installedAt <= now() - INTERVAL 30 DAY) AS installsD30
    FROM (
      SELECT
        appUserId,
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
    ) i
    ${joins("i")}
    GROUP BY ${attrGroup}, country
    FORMAT JSON
  `;
  const outcomesQuery = `
    SELECT
      ${attrSelect},
      e.country AS country,
      uniqIf(e.originalTransactionId, e.name = 'initial_purchase' AND lower(ifNull(e.periodType, '')) = 'trial') AS trials,
      uniqIf(e.originalTransactionId, e.name = 'renewal' AND e.isTrialConversion = 1) AS converted,
      uniqIf(
        e.originalTransactionId,
        (e.name = 'initial_purchase' AND lower(ifNull(e.periodType, '')) != 'trial')
        OR (e.name = 'renewal' AND e.isTrialConversion = 1)
      ) AS paid
    FROM (
      SELECT
        appUserId,
        name,
        periodType,
        isTrialConversion,
        originalTransactionId,
        ifNull(nullIf(countryCode, ''), 'unknown') AS country
      FROM open_revenue.attributed_events_by_ts_rep FINAL
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND source = 'integration'
        AND isFamilyShare = 0
        AND installDate >= toDateTime64('${start}', 6, 'UTC')
        AND installDate < toDateTime64('${end}', 6, 'UTC')
        AND ts >= toDateTime64('${start}', 6, 'UTC')
        AND ts < toDateTime64('${end}', 6, 'UTC')
        AND ts < now()
    ) e
    ${joins("e")}
    GROUP BY ${attrGroup}, country
    FORMAT JSON
  `;
  const proceedsQuery = `
    SELECT
      ${attrGroup},
      country,
      round(sum(net_proceeds), 2) AS proceeds,
      round(sumIf(net_proceeds, eventTs <= cohortStart + INTERVAL 7 DAY AND cohortStart <= now() - INTERVAL 7 DAY), 2) AS proceedsD7,
      round(sumIf(net_proceeds, eventTs <= cohortStart + INTERVAL 14 DAY AND cohortStart <= now() - INTERVAL 14 DAY), 2) AS proceedsD14,
      round(sumIf(net_proceeds, eventTs <= cohortStart + INTERVAL 30 DAY AND cohortStart <= now() - INTERVAL 30 DAY), 2) AS proceedsD30
    FROM (
      SELECT
        ${attrSelect},
        e.country AS country,
        e.cohortStart AS cohortStart,
        e.eventTs AS eventTs,
        e.name,
        e.originalTransactionId,
        e.transactionId,
        e.net_proceeds AS net_proceeds
      FROM (
        SELECT
          appUserId,
          name,
          originalTransactionId,
          transactionId,
          ifNull(nullIf(countryCode, ''), 'unknown') AS country,
          any(installDate) AS cohortStart,
          argMax(ts, attributionTs) AS eventTs,
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
          AND installDate >= toDateTime64('${start}', 6, 'UTC')
          AND installDate < toDateTime64('${end}', 6, 'UTC')
          AND ts < now()
        GROUP BY appUserId, name, originalTransactionId, transactionId, country
      ) e
      ${joins("e")}
    )
    GROUP BY ${attrGroup}, country
    FORMAT JSON
  `;
  const retentionQuery = `
    SELECT
      any(appUserId) AS appUserId,
      ifNull(nullIf(any(countryCode), ''), 'unknown') AS country,
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
  `;
  const assignmentQuery = `
    SELECT appUserId, key, lower(value) AS value
    FROM sw.user_attributes_rep FINAL
    WHERE applicationId = ${app.applicationId}
      AND isSandbox = 0
      AND isDeleted = 0
      AND ts < now()
      AND key IN (${definition.attributeKeys.map((key) => `'${key}'`).join(", ")})
    FORMAT JSON
  `;

  const [installResult, outcomeResult, proceedResult, retentionResult, assignmentResult] = await Promise.allSettled([
    querySuperwall<Record<string, string | number>>(installsQuery, app.organizationId, app.apiKey),
    querySuperwall<Record<string, string | number>>(outcomesQuery, app.organizationId, app.apiKey),
    querySuperwall<Record<string, string | number | null>>(proceedsQuery, app.organizationId, app.apiKey),
    querySuperwall<{ appUserId: string | null; country: string; startedAt: string; expiresAt: string | null }>(
      retentionQuery,
      app.organizationId,
      app.apiKey,
    ),
    querySuperwall<{ appUserId: string; key: string; value: string }>(assignmentQuery, app.organizationId, app.apiKey),
  ]);

  const failed = [installResult, outcomeResult, proceedResult, retentionResult, assignmentResult].find(
    (result) => result.status === "rejected",
  );
  if (failed && failed.status === "rejected") {
    const log = process.env.NODE_ENV === "development" ? console.warn : console.error;
    log("tap_and_swipe.attribute_experiment_partial", {
      id: definition.id,
      error: failed.reason instanceof Error ? failed.reason.message : String(failed.reason),
    });
  }

  const variants = definition.variants.map((variant) => emptyExperimentVariant(variant.key, variant.label));
  const targetFor = (row: Record<string, string | number | null | undefined>) => {
    const matched = definition.variants.find((variant) =>
      Object.entries(variant.attributes).every(([key, value]) => String(row[key] ?? "").trim().toLowerCase() === value),
    );
    return matched ? variants[definition.variants.indexOf(matched)] : null;
  };

  if (installResult.status === "fulfilled") {
    for (const row of installResult.value) {
      const target = targetFor(row);
      if (target) {
        addExperimentMetrics(target, {
          country: String(row.country),
          installs: Number(row.installs),
          installsD7: Number(row.installsD7 ?? 0),
          installsD14: Number(row.installsD14 ?? 0),
          installsD30: Number(row.installsD30 ?? 0),
        });
      }
    }
  }
  if (outcomeResult.status === "fulfilled") {
    for (const row of outcomeResult.value) {
      const target = targetFor(row);
      if (target) {
        addExperimentMetrics(target, {
          country: String(row.country),
          trials: Number(row.trials),
          converted: Number(row.converted),
          paid: Number(row.paid),
        });
      }
    }
  }
  if (proceedResult.status === "fulfilled") {
    for (const row of proceedResult.value) {
      const target = targetFor(row);
      if (target) {
        addExperimentMetrics(target, {
          country: String(row.country),
          proceeds: Number(row.proceeds ?? 0),
          proceedsD7: Number(row.proceedsD7 ?? 0),
          proceedsD14: Number(row.proceedsD14 ?? 0),
          proceedsD30: Number(row.proceedsD30 ?? 0),
        });
      }
    }
  }

  if (definition.showRetention && retentionResult.status === "fulfilled" && assignmentResult.status === "fulfilled") {
    const assignments = new Map<string, Record<string, string>>();
    for (const row of assignmentResult.value) {
      const current = assignments.get(row.appUserId) ?? {};
      current[row.key] = row.value;
      assignments.set(row.appUserId, current);
    }
    const now = Date.now();
    for (const row of retentionResult.value) {
      if (!row.appUserId) continue;
      const attrs = assignments.get(row.appUserId);
      if (!attrs) continue;
      const target = targetFor(attrs);
      if (!target) continue;
      const startedAt = Date.parse(row.startedAt);
      if (!Number.isFinite(startedAt)) continue;
      const expiresAt = row.expiresAt ? Date.parse(row.expiresAt) : Number.NaN;
      const metrics: Partial<MobileAppExperimentSlice> = {};
      for (const [key, days] of [
        ["D7", 7],
        ["D14", 14],
        ["D30", 30],
      ] as const) {
        const checkpoint = startedAt + days * 86_400_000;
        if (checkpoint > now) continue;
        const eligibleKey = `eligible${key}` as const;
        const retainedKey = `retained${key}` as const;
        metrics[eligibleKey] = 1;
        metrics[retainedKey] = Number.isFinite(expiresAt) && expiresAt > checkpoint ? 1 : 0;
      }
      addExperimentMetrics(target, { country: row.country, ...metrics });
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
    variants,
  };
}

function attributeAlias(index: number) {
  return `a${index}`;
}

function userAttributeJoin(app: SuperwallAppConfig, alias: string, key: string, leftAlias: string) {
  return `
    INNER JOIN (
      SELECT appUserId, lower(value) AS value
      FROM sw.user_attributes_rep FINAL
      WHERE applicationId = ${app.applicationId}
        AND isSandbox = 0
        AND isDeleted = 0
        AND ts < now()
        AND key = '${key}'
    ) ${alias} ON ${leftAlias}.appUserId = ${alias}.appUserId`;
}

function emptyExperimentVariant(key: string, label: string): MobileAppExperimentVariant {
  return { key, label, ...emptyExperimentSlice(), countries: {} };
}

function emptyExperimentSlice(): MobileAppExperimentSlice {
  return {
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
