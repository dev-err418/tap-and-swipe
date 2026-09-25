import "server-only";
import { createHash } from "node:crypto";
import { appAnalyticsPeriodRange } from "./app-analytics-time";
import {
  VERSY_FEATURES,
  cancellationJourneys,
  emptyTrialComparison,
  emptyVersyProductReport,
  featureUsage,
  journeyEvents,
  rate,
  trialComparison,
  type VersyCancellation,
  type VersyCancellationActivity,
  type VersyProductReport,
  type VersyTrialEvent,
  type VersyTrialStart,
} from "./versy-product-analytics";

export type VersyProductPeriod = "day" | "yesterday" | "3days" | "week" | "month" | "all";

export type VersyUserJourneyReport = {
  status: "ready" | "empty" | "setup_required" | "unavailable";
  user: string;
  windowStart: string;
  windowEnd: string;
  truncated: boolean;
  latestObservedAccess: boolean | null;
  latestObservedPhase: string | null;
  accessObservedAt: string | null;
  totals: { quoteViews: number; quoteSwipes: number; quoteLikes: number; prayerStarts: number; widgetOpens: number; notificationOpens: number };
  events: { at: string; event: string; screen: string | null; category: string | null; source: string | null;
    isPremium: boolean | null; hasWidget: boolean | null; notificationPermission: string | null;
    accessPhase: string | null; feedbackReason: string | null;
    selectedCategories: string[]; cancelReason: string | null; inferredSource: string | null;
    result: string | null; placement: string | null; variant: string | null;
    quoteViews: number | null; quoteSwipes: number | null; durationSeconds: number | null;
    appVersion: string | null; appBuild: string | null }[];
  note?: string;
};

const POSTHOG_HOST = process.env.POSTHOG_VERSY_REGION === "us"
  ? "https://us.posthog.com" : "https://eu.posthog.com";
const FIRST_INSTRUMENTED_DAY = new Date("2026-09-25T00:00:00Z");
const CACHE_MS = 90_000;
const MAX_RECENT_CANCELLATIONS = 25;
const MAX_HISTORY_ROWS = 5_000;
const MAX_USER_EVENTS = 250;
const MAX_TRIAL_STARTS = 300;
const MAX_TRIAL_ACTIVITY = 15_000;
const USER_EVENTS = [...new Set([
  ...journeyEvents(), "app_state_snapshot", "notification_permission_requested", "widget_prompt_action",
  "widget_removed_detected", "quote_reading_session", "prayer_session_ended", "premium_status_changed",
  "paywall_reached", "paywall_dismissed", "paywall_purchase_attempted", "paywall_purchase_result",
  "sw_trial_cancelled", "sw_trial_expired", "sw_subscription_cancelled", "sw_subscription_start",
  "sw_intro_offer_cancelled", "subscription_feedback_opened", "subscription_feedback_submitted",
  "access_phase_changed",
])];
const cache = new Map<string, { expiresAt: number; report: VersyProductReport }>();
const inflight = new Map<string, Promise<VersyProductReport>>();

function sqlTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function sqlQuote(value: string): string {
  return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
}

function timeFilter(start: Date, end: Date): string {
  return `timestamp >= toDateTime('${sqlTime(start)}', 'UTC') AND timestamp < toDateTime('${sqlTime(end)}', 'UTC')`;
}

function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function toTimestamp(value: unknown): string {
  const seconds = Number(value);
  return Number.isFinite(seconds) ? new Date(seconds * 1_000).toISOString() : "";
}

function safeToken(value: unknown): string | null {
  const token = String(value ?? "");
  return /^[a-zA-Z0-9_$:.-]{1,80}$/.test(token) ? token : null;
}

function boolOrNull(value: unknown): boolean | null {
  const text = String(value ?? "");
  return text === "true" || text === "1" ? true : text === "false" || text === "0" ? false : null;
}

function safeCategories(value: unknown): string[] {
  try {
    const parsed: unknown = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && /^[a-z0-9_-]{1,50}$/.test(item)).slice(0, 30) : [];
  } catch { return []; }
}

async function queryPostHog(sql: string, projectId: string, key: string): Promise<unknown[][]> {
  const response = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query: sql } }),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`PostHog query returned HTTP ${response.status}`);
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !Array.isArray((data as { results?: unknown }).results)) {
    throw new Error("PostHog returned an invalid query result");
  }
  return (data as { results: unknown[][] }).results;
}

export async function getVersyProductReport(period: VersyProductPeriod): Promise<VersyProductReport> {
  const window = appAnalyticsPeriodRange(period);
  const start = new Date(Math.max(window.since.getTime(), FIRST_INSTRUMENTED_DAY.getTime()));
  const end = window.before;
  const key = process.env.POSTHOG_VERSY_READ_KEY?.trim();
  const projectId = process.env.POSTHOG_VERSY_PROJECT_ID?.trim();
  if (!key || !projectId || !/^\d+$/.test(projectId)) {
    return emptyVersyProductReport("setup_required", start, end, "Versy product analytics is waiting for PostHog read access.");
  }
  const cacheKey = `${period}:${projectId}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.report;
  const pending = inflight.get(cacheKey);
  if (pending) return pending;
  const promise = loadVersyProductReport(start, end, projectId, key).then((report) => {
    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_MS, report });
    inflight.delete(cacheKey);
    return report;
  }, (error) => {
    inflight.delete(cacheKey);
    throw error;
  });
  inflight.set(cacheKey, promise);
  return promise;
}

/** Exact Superwall-ID lookup for an authenticated owner or trusted agent. */
export async function getVersyUserJourney(period: VersyProductPeriod, userId: string): Promise<VersyUserJourneyReport> {
  const window = appAnalyticsPeriodRange(period);
  const start = new Date(Math.max(window.since.getTime(), FIRST_INSTRUMENTED_DAY.getTime()));
  const end = window.before;
  const base: VersyUserJourneyReport = {
    status: "empty", user: createHash("sha256").update(userId).digest("hex").slice(0, 12),
    windowStart: start.toISOString(), windowEnd: end.toISOString(), truncated: false,
    latestObservedAccess: null, latestObservedPhase: null, accessObservedAt: null,
    totals: { quoteViews: 0, quoteSwipes: 0, quoteLikes: 0, prayerStarts: 0, widgetOpens: 0, notificationOpens: 0 },
    events: [],
  };
  const key = process.env.POSTHOG_VERSY_READ_KEY?.trim();
  const projectId = process.env.POSTHOG_VERSY_PROJECT_ID?.trim();
  if (!key || !projectId || !/^\d+$/.test(projectId)) {
    return { ...base, status: "setup_required", note: "Versy product analytics is waiting for PostHog read access." };
  }
  try {
    const [rows, premiumSnapshots, totals] = await Promise.all([
      queryPostHog(`SELECT event, toUnixTimestamp(timestamp),
        toString(properties.screen), toString(properties.category_id), toString(properties.source),
        toString(properties.is_premium), toString(properties.has_widget),
        toString(properties.notification_permission), toString(properties.selected_categories),
        toString(properties.cancelReason), toString(properties.inferred_source),
        toString(properties.result), toString(properties.placement), toString(properties.variant),
        toString(properties.quote_views), toString(properties.quote_swipes),
        toString(properties.duration_seconds), toString(properties.app_version),
        toString(properties.app_build), toString(properties.access_phase),
        toString(properties.reason)
      FROM events WHERE ${timeFilter(start, end)} AND distinct_id = ${sqlQuote(userId)}
        AND event IN (${USER_EVENTS.map(sqlQuote).join(", ")})
        AND ((startsWith(event, 'sw_') AND lower(toString(properties.environment)) = 'production')
          OR properties.app_environment = 'production')
      ORDER BY timestamp DESC LIMIT ${MAX_USER_EVENTS + 1}`, projectId, key),
      queryPostHog(`SELECT toString(properties.is_premium), toUnixTimestamp(timestamp),
          toString(properties.access_phase)
        FROM events WHERE timestamp >= toDateTime('${sqlTime(FIRST_INSTRUMENTED_DAY)}', 'UTC')
          AND timestamp < toDateTime('${sqlTime(end)}', 'UTC') AND distinct_id = ${sqlQuote(userId)}
          AND event = 'app_state_snapshot' AND properties.app_environment = 'production'
        ORDER BY timestamp DESC LIMIT 1`, projectId, key),
      queryPostHog(`SELECT event, count()
        FROM events WHERE ${timeFilter(start, end)} AND distinct_id = ${sqlQuote(userId)}
          AND properties.app_environment = 'production'
          AND event IN ('quote_viewed', 'quote_swiped', 'quote_liked',
            'prayer_session_started', 'app_opened_from_widget', 'app_opened_from_notification')
        GROUP BY event LIMIT 6`, projectId, key),
    ]);
    base.truncated = rows.length > MAX_USER_EVENTS;
    base.events = rows.slice(0, MAX_USER_EVENTS).map((row) => ({
      event: String(row[0]), at: toTimestamp(row[1]), screen: safeToken(row[2]),
      category: safeToken(row[3]), source: safeToken(row[4]), isPremium: boolOrNull(row[5]),
      hasWidget: boolOrNull(row[6]), notificationPermission: safeToken(row[7]),
      selectedCategories: safeCategories(row[8]), cancelReason: safeToken(row[9]),
      inferredSource: safeToken(row[10]), result: safeToken(row[11]),
      placement: safeToken(row[12]), variant: safeToken(row[13]),
      quoteViews: nullableNumber(row[14]), quoteSwipes: nullableNumber(row[15]),
      durationSeconds: nullableNumber(row[16]),
      appVersion: safeToken(row[17]), appBuild: safeToken(row[18]),
      accessPhase: safeToken(row[19]), feedbackReason: safeToken(row[20]),
    })).filter((event) => event.at);
    base.latestObservedAccess = boolOrNull(premiumSnapshots[0]?.[0]);
    base.latestObservedPhase = safeToken(premiumSnapshots[0]?.[2]);
    base.accessObservedAt = premiumSnapshots[0]?.[1] == null ? null : toTimestamp(premiumSnapshots[0][1]);
    const totalKeys = {
      quote_viewed: "quoteViews", quote_swiped: "quoteSwipes", quote_liked: "quoteLikes",
      prayer_session_started: "prayerStarts", app_opened_from_widget: "widgetOpens",
      app_opened_from_notification: "notificationOpens",
    } as const;
    for (const row of totals) {
      const key = totalKeys[String(row[0]) as keyof typeof totalKeys];
      if (key) base.totals[key] = toNumber(row[1]);
    }
    base.status = base.events.length ? "ready" : "empty";
    return base;
  } catch (error) {
    console.error("tap_and_swipe.versy_user_journey_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...base, status: "unavailable", note: "PostHog user journey is unavailable. Refresh to retry." };
  }
}

async function loadVersyProductReport(start: Date, end: Date, projectId: string, key: string): Promise<VersyProductReport> {
  const report = emptyVersyProductReport("empty", start, end);
  const window = timeFilter(start, end);
  const production = "properties.app_environment = 'production'";
  try {
    const [permissions, notificationSnapshots, widgetSnapshots, widgetAdds, widgetPrompts, features, reading, favorites, screens, categories, premiumUse, feedback, recentTrialCancels, recentPaidCancels, prefetchedTrialStarts] = await Promise.all([
      queryPostHog(`SELECT
          uniqExactIf(distinct_id, event = 'notification_permission_requested'),
          uniqExactIf(distinct_id, event = 'notification_permission_resolved'
            AND toString(properties.result) IN ('authorized', 'provisional', 'ephemeral')),
          uniqExactIf(distinct_id, event = 'notification_permission_resolved'
            AND toString(properties.result) = 'denied'),
          uniqExactIf(distinct_id, event = 'notification_permission_resolved'
            AND toString(properties.result) IN ('authorized', 'provisional', 'ephemeral', 'denied'))
        FROM events WHERE ${window} AND ${production}
          AND event IN ('notification_permission_requested', 'notification_permission_resolved')`, projectId, key),
      queryPostHog(`SELECT count(),
          countIf(permission IN ('authorized', 'provisional', 'ephemeral', 'denied')),
          countIf(permission IN ('authorized', 'provisional', 'ephemeral')),
          countIf(enabled IN ('true', '1'))
        FROM (SELECT distinct_id,
          argMax(ifNull(toString(properties.notification_permission), 'unknown'), timestamp) AS permission,
          argMax(ifNull(toString(properties.notifications_enabled), 'unknown'), timestamp) AS enabled
          FROM events WHERE ${window} AND ${production} AND event = 'app_state_snapshot'
          GROUP BY distinct_id)`, projectId, key),
      queryPostHog(`SELECT uniqExactIf(distinct_id, properties.has_widget IS NOT NULL),
          uniqExactIf(distinct_id, toString(properties.has_widget) IN ('true', '1'))
        FROM events WHERE ${window} AND ${production} AND event = 'app_state_snapshot'`, projectId, key),
      queryPostHog(`SELECT toString(properties.inferred_source), uniqExact(distinct_id), count()
        FROM events WHERE ${window} AND ${production} AND event = 'widget_installed_detected'
        GROUP BY toString(properties.inferred_source) LIMIT 20`, projectId, key),
      queryPostHog(`SELECT toString(properties.source), uniqExact(distinct_id)
        FROM events WHERE ${window} AND ${production} AND event = 'widget_prompt_viewed'
        GROUP BY toString(properties.source) LIMIT 20`, projectId, key),
      queryPostHog(`SELECT event, uniqExact(distinct_id), count()
        FROM events WHERE ${window} AND ${production}
          AND event IN (${VERSY_FEATURES.map((feature) => sqlQuote(feature.event)).join(", ")})
        GROUP BY event LIMIT 20`, projectId, key),
      queryPostHog(`SELECT uniqExact(distinct_id), count(),
          sum(toFloatOrZero(toString(properties.quote_views))),
          sum(toFloatOrZero(toString(properties.quote_swipes))),
          sum(toFloatOrZero(toString(properties.duration_seconds)))
        FROM events WHERE ${window} AND ${production} AND event = 'quote_reading_session'`, projectId, key),
      queryPostHog(`SELECT count(), sum(toFloatOrZero(favorite_count)),
          countIf(toFloatOrZero(favorite_count) > 0)
        FROM (SELECT distinct_id,
          argMax(ifNull(toString(properties.favorite_count), '0'), timestamp) AS favorite_count
          FROM events WHERE ${window} AND ${production} AND event = 'app_state_snapshot'
          GROUP BY distinct_id)`, projectId, key),
      queryPostHog(`SELECT toString(properties.screen), uniqExact(distinct_id),
          sum(toFloatOrZero(toString(properties.duration_seconds)))
        FROM events WHERE ${window} AND ${production} AND event = 'screen_time'
        GROUP BY toString(properties.screen) ORDER BY uniqExact(distinct_id) DESC LIMIT 25`, projectId, key),
      queryPostHog(`SELECT replaceAll(arrayJoin(JSONExtractArrayRaw(ifNull(toString(properties.selected_categories), '[]'))), '"', ''),
          uniqExact(distinct_id)
        FROM events WHERE ${window} AND ${production} AND event = 'app_state_snapshot'
        GROUP BY 1 ORDER BY uniqExact(distinct_id) DESC LIMIT 25`, projectId, key),
      queryPostHog(`SELECT toString(properties.access_phase), event, uniqExact(distinct_id), count()
        FROM events WHERE ${window} AND ${production}
          AND event IN (${VERSY_FEATURES.map((feature) => sqlQuote(feature.event)).join(", ")})
        GROUP BY toString(properties.access_phase), event LIMIT 100`, projectId, key),
      queryPostHog(`SELECT toString(properties.reason), uniqExact(distinct_id)
        FROM events WHERE ${window} AND ${production}
          AND event = 'subscription_feedback_submitted'
        GROUP BY toString(properties.reason) LIMIT 20`, projectId, key),
      queryPostHog(`SELECT distinct_id, toUnixTimestamp(timestamp), toString(properties.cancelReason)
        FROM events WHERE ${window} AND event = 'sw_trial_cancelled'
          AND lower(toString(properties.environment)) = 'production'
        ORDER BY timestamp DESC LIMIT ${MAX_RECENT_CANCELLATIONS}`, projectId, key),
      queryPostHog(`SELECT distinct_id, toUnixTimestamp(timestamp), toString(properties.cancelReason)
        FROM events WHERE ${window} AND event IN ('sw_subscription_cancelled', 'sw_intro_offer_cancelled')
          AND lower(toString(properties.environment)) = 'production'
        ORDER BY timestamp DESC LIMIT ${MAX_RECENT_CANCELLATIONS}`, projectId, key),
      trialStartsQuery(start, end, projectId, key),
    ]);

    report.notifications.requestedUsers = toNumber(permissions[0]?.[0]);
    report.notifications.allowedUsers = toNumber(permissions[0]?.[1]);
    report.notifications.deniedUsers = toNumber(permissions[0]?.[2]);
    report.notifications.resolvedUsers = toNumber(permissions[0]?.[3]);
    report.notifications.allowRate = rate(report.notifications.allowedUsers, report.notifications.resolvedUsers);
    report.notifications.observedUsers = toNumber(notificationSnapshots[0]?.[0]);
    report.notifications.observedDecidedUsers = toNumber(notificationSnapshots[0]?.[1]);
    report.notifications.observedAllowedUsers = toNumber(notificationSnapshots[0]?.[2]);
    report.notifications.observedAllowRate = rate(
      report.notifications.observedAllowedUsers, report.notifications.observedDecidedUsers);
    report.notifications.remindersEnabledUsers = toNumber(notificationSnapshots[0]?.[3]);
    report.notifications.remindersEnabledRate = rate(
      report.notifications.remindersEnabledUsers, report.notifications.observedUsers);
    report.widgets.checkedUsers = toNumber(widgetSnapshots[0]?.[0]);
    report.widgets.seenInstalledUsers = toNumber(widgetSnapshots[0]?.[1]);
    report.widgets.seenInstalledRate = rate(report.widgets.seenInstalledUsers, report.widgets.checkedUsers);
    const promptUsers = new Map(widgetPrompts.map((row) => [String(row[0] || "unattributed"), toNumber(row[1])]));
    report.widgets.sources = widgetAdds.map((row) => ({
      source: String(row[0] || "unattributed"), users: toNumber(row[1]),
      promptedUsers: promptUsers.get(String(row[0] || "unattributed")) ?? 0,
    }));
    for (const [source, promptedUsers] of promptUsers) {
      if (!report.widgets.sources.some((row) => row.source === source)) {
        report.widgets.sources.push({ source, users: 0, promptedUsers });
      }
    }
    report.widgets.sources.sort((a, b) => b.users - a.users || b.promptedUsers - a.promptedUsers);
    report.widgets.detectedAdds = widgetAdds.reduce((total, row) => total + toNumber(row[2]), 0);
    report.features = featureUsage(features.map((row) => ({
      event: String(row[0] ?? ""), users: toNumber(row[1]), events: toNumber(row[2]),
    })));
    report.reading.users = toNumber(reading[0]?.[0]);
    report.reading.sessions = toNumber(reading[0]?.[1]);
    report.reading.quoteViewsPerSession = rate(toNumber(reading[0]?.[2]), report.reading.sessions);
    report.reading.swipesPerSession = rate(toNumber(reading[0]?.[3]), report.reading.sessions);
    report.reading.secondsPerSession = rate(toNumber(reading[0]?.[4]), report.reading.sessions);
    report.favorites.observedUsers = toNumber(favorites[0]?.[0]);
    report.favorites.usersWithFavorites = toNumber(favorites[0]?.[2]);
    report.favorites.averageSaved = rate(toNumber(favorites[0]?.[1]), report.favorites.observedUsers);
    report.favorites.adoptionRate = rate(report.favorites.usersWithFavorites, report.favorites.observedUsers);
    report.screens = screens.map((row) => {
      const users = toNumber(row[1]);
      const totalSeconds = toNumber(row[2]);
      return { screen: String(row[0] ?? ""), users, totalSeconds, secondsPerUser: rate(totalSeconds, users) };
    }).filter((row) => /^[a-zA-Z_]{1,50}$/.test(row.screen));
    report.categories = categories.map((row) => ({ category: String(row[0] ?? ""), users: toNumber(row[1]) }))
      .filter((row) => /^[a-z0-9_-]{1,50}$/.test(row.category));
    report.premiumUse = (["trial", "paid", "free", "unknown"] as const).map((status) => ({
      status,
      features: featureUsage(premiumUse.filter((row) => {
        const phase = String(row[0] ?? "");
        return phase === status || (status === "unknown" && !["trial", "paid", "free"].includes(phase));
      })
        .map((row) => ({ event: String(row[1] ?? ""), users: toNumber(row[2]), events: toNumber(row[3]) }))),
    }));
    report.feedback = feedback.map((row) => ({ reason: String(row[0] ?? ""), users: toNumber(row[1]) }))
      .filter((row) => ["price", "not_enough_use", "content_fit", "notifications", "widget", "technical_issue", "other"].includes(row.reason))
      .sort((a, b) => b.users - a.users);
    const cancellations = (rows: unknown[][]): VersyCancellation[] => rows.map((row) => ({
      distinctId: String(row[0] ?? ""), timestamp: toTimestamp(row[1]), reason: String(row[2] ?? "") || null,
    })).filter((row) => row.distinctId && row.timestamp);
    const trialCancellations = cancellations(recentTrialCancels);
    const paidCancellations = cancellations(recentPaidCancels);
    const [trialComparisonResult, historyResult] = await Promise.all([
      loadTrialComparison(start, end, projectId, key, prefetchedTrialStarts).catch((error: unknown) => {
        console.error("tap_and_swipe.versy_trial_comparison_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return emptyTrialComparison("unavailable");
      }),
      cancellationHistory(trialCancellations, paidCancellations, end, projectId, key, production),
    ]);
    report.trialComparison = trialComparisonResult;
    if (historyResult) {
      report.cancellations = historyResult.trial;
      report.paidCancellations = historyResult.paid;
    }
    report.status = report.notifications.resolvedUsers || report.notifications.observedUsers || report.widgets.checkedUsers
      || report.features.some((feature) => feature.events > 0)
      || report.reading.sessions || report.screens.length || report.categories.length
      || report.feedback.length
      || report.cancellations.recentCount || report.paidCancellations.recentCount ? "ready" : "empty";
    return report;
  } catch (error) {
    console.error("tap_and_swipe.versy_product_analytics_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return emptyVersyProductReport("unavailable", start, end, "PostHog product analytics is unavailable. Refresh to retry.");
  }
}

function trialStartsQuery(start: Date, end: Date, projectId: string, key: string) {
  const maturityEnd = new Date(end.getTime() - 96 * 3_600_000);
  if (maturityEnd <= start) return Promise.resolve(null);
  return queryPostHog(`SELECT distinct_id, toUnixTimestamp(timestamp),
      toString(properties.productId)
    FROM events WHERE ${timeFilter(start, maturityEnd)} AND event = 'sw_trial_start'
      AND lower(toString(properties.environment)) = 'production'
    ORDER BY timestamp DESC LIMIT ${MAX_TRIAL_STARTS + 1}`, projectId, key);
}

async function cancellationHistory(
  trialCancellations: VersyCancellation[],
  paidCancellations: VersyCancellation[],
  end: Date,
  projectId: string,
  key: string,
  production: string,
) {
  const allCancellations = [...trialCancellations, ...paidCancellations];
  if (allCancellations.length === 0) return null;
  try {
    const earliest = Math.min(...allCancellations.map((row) => Date.parse(row.timestamp)));
    const historyStart = new Date(earliest - 7 * 86_400_000);
    const ids = [...new Set(allCancellations.map((row) => row.distinctId))];
    const history = await queryPostHog(`SELECT distinct_id, event, toUnixTimestamp(timestamp),
        toString(properties.screen), toString(properties.app_version),
        toString(properties.reason)
      FROM events WHERE ${timeFilter(historyStart, end)}
        AND distinct_id IN (${ids.map(sqlQuote).join(", ")})
        AND event IN (${journeyEvents().map(sqlQuote).join(", ")})
        AND ((event = 'sw_trial_start' AND lower(toString(properties.environment)) = 'production')
          OR ${production})
      ORDER BY timestamp DESC LIMIT ${MAX_HISTORY_ROWS}`, projectId, key);
    if (history.length >= MAX_HISTORY_ROWS) throw new Error("Cancellation activity exceeded the safe query limit");
    const activity: VersyCancellationActivity[] = history.map((row) => ({
      distinctId: String(row[0] ?? ""), event: String(row[1] ?? ""),
      timestamp: toTimestamp(row[2]), screen: String(row[3] ?? "") || null,
      appVersion: String(row[4] ?? "") || null,
      reason: safeToken(row[5]),
    }));
    const hash = (distinctId: string) => createHash("sha256").update(distinctId).digest("hex").slice(0, 12);
    return {
      trial: cancellationJourneys(trialCancellations, activity, hash),
      paid: cancellationJourneys(paidCancellations, activity, hash),
    };
  } catch (error) {
    console.error("tap_and_swipe.versy_cancellation_history_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function loadTrialComparison(
  start: Date,
  end: Date,
  projectId: string,
  key: string,
  startsRows: unknown[][] | null,
) {
  if (!startsRows) return emptyTrialComparison();
  if (startsRows.length > MAX_TRIAL_STARTS) return emptyTrialComparison("truncated");
  const starts: VersyTrialStart[] = startsRows.map((row) => {
    const productId = safeToken(row[2]);
    return { distinctId: String(row[0] ?? ""), timestamp: toTimestamp(row[1]),
      productId: productId && productId.toLowerCase() !== "none" ? productId : "unknown" };
  }).filter((row) => row.distinctId && row.timestamp);
  if (!starts.length) return emptyTrialComparison();
  const ids = [...new Set(starts.map((row) => row.distinctId))];
  const earliest = new Date(Math.min(...starts.map((row) => Date.parse(row.timestamp))));
  const activityRows = await queryPostHog(`SELECT distinct_id, event, toUnixTimestamp(timestamp)
    FROM events WHERE ${timeFilter(earliest, end)} AND distinct_id IN (${ids.map(sqlQuote).join(", ")})
      AND event IN ('sw_trial_cancelled', ${VERSY_FEATURES.map((feature) => sqlQuote(feature.event)).join(", ")})
      AND ((event = 'sw_trial_cancelled' AND lower(toString(properties.environment)) = 'production')
        OR properties.app_environment = 'production')
    ORDER BY timestamp DESC LIMIT ${MAX_TRIAL_ACTIVITY + 1}`, projectId, key);
  if (activityRows.length > MAX_TRIAL_ACTIVITY) return emptyTrialComparison("truncated");
  const activity: VersyTrialEvent[] = activityRows.map((row) => ({
    distinctId: String(row[0] ?? ""), event: String(row[1] ?? ""), timestamp: toTimestamp(row[2]),
  })).filter((row) => row.distinctId && row.timestamp);
  return trialComparison(starts, activity, end);
}
