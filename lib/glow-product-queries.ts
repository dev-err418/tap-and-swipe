import "server-only";
import { createHash } from "node:crypto";
import { appAnalyticsPeriodRange } from "./app-analytics-time";
import {
  GLOW_FEATURES,
  cancellationJourneys,
  emptyGlowProductReport,
  featureUsage,
  journeyEvents,
  rate,
  type GlowCancellation,
  type GlowCancellationActivity,
  type GlowProductReport,
} from "./glow-product-analytics";

export type GlowProductPeriod = "day" | "yesterday" | "3days" | "week" | "month" | "all";

export type GlowUserJourneyReport = {
  status: "ready" | "empty" | "setup_required" | "unavailable";
  user: string;
  windowStart: string;
  windowEnd: string;
  truncated: boolean;
  latestObservedAccess: boolean | null;
  accessObservedAt: string | null;
  totals: { quoteViews: number; quoteSwipes: number; quoteLikes: number; practiceStarts: number; widgetOpens: number; notificationOpens: number };
  events: { at: string; event: string; screen: string | null; category: string | null; source: string | null;
    isPremium: boolean | null; hasWidget: boolean | null; notificationPermission: string | null;
    selectedCategories: string[]; cancelReason: string | null }[];
  note?: string;
};

const POSTHOG_HOST = "https://eu.posthog.com";
const FIRST_INSTRUMENTED_DAY = new Date("2026-09-25T00:00:00Z");
const CACHE_MS = 90_000;
const MAX_RECENT_CANCELLATIONS = 25;
const MAX_HISTORY_ROWS = 5_000;
const MAX_USER_EVENTS = 250;
const USER_EVENTS = [...new Set([
  ...journeyEvents(), "app_state_snapshot", "notification_permission_requested", "widget_prompt_action",
  "widget_removed_detected", "quote_reading_session", "practice_session_ended", "premium_status_changed",
  "paywall_reached", "paywall_dismissed", "paywall_purchase_attempted", "paywall_purchase_result",
  "sw_trial_cancelled", "sw_trial_expired", "sw_subscription_cancelled", "sw_subscription_start",
])];
const cache = new Map<string, { expiresAt: number; report: GlowProductReport }>();
const inflight = new Map<string, Promise<GlowProductReport>>();

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

export async function getGlowProductReport(period: GlowProductPeriod): Promise<GlowProductReport> {
  const window = appAnalyticsPeriodRange(period);
  const start = new Date(Math.max(window.since.getTime(), FIRST_INSTRUMENTED_DAY.getTime()));
  const end = window.before;
  const key = process.env.POSTHOG_GLOW_READ_KEY?.trim();
  const projectId = process.env.POSTHOG_GLOW_PROJECT_ID?.trim();
  if (!key || !projectId || !/^\d+$/.test(projectId)) {
    return emptyGlowProductReport("setup_required", start, end, "Glow product analytics is waiting for PostHog read access.");
  }
  const cacheKey = `${period}:${projectId}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.report;
  const pending = inflight.get(cacheKey);
  if (pending) return pending;
  const promise = loadGlowProductReport(start, end, projectId, key).then((report) => {
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
export async function getGlowUserJourney(period: GlowProductPeriod, userId: string): Promise<GlowUserJourneyReport> {
  const window = appAnalyticsPeriodRange(period);
  const start = new Date(Math.max(window.since.getTime(), FIRST_INSTRUMENTED_DAY.getTime()));
  const end = window.before;
  const base: GlowUserJourneyReport = {
    status: "empty", user: createHash("sha256").update(userId).digest("hex").slice(0, 12),
    windowStart: start.toISOString(), windowEnd: end.toISOString(), truncated: false,
    latestObservedAccess: null, accessObservedAt: null,
    totals: { quoteViews: 0, quoteSwipes: 0, quoteLikes: 0, practiceStarts: 0, widgetOpens: 0, notificationOpens: 0 },
    events: [],
  };
  const key = process.env.POSTHOG_GLOW_READ_KEY?.trim();
  const projectId = process.env.POSTHOG_GLOW_PROJECT_ID?.trim();
  if (!key || !projectId || !/^\d+$/.test(projectId)) {
    return { ...base, status: "setup_required", note: "Glow product analytics is waiting for PostHog read access." };
  }
  try {
    const [rows, premiumSnapshots, totals] = await Promise.all([
      queryPostHog(`SELECT event, toUnixTimestamp(timestamp),
        toString(properties.screen), toString(properties.category_id), toString(properties.source),
        toString(properties.is_premium), toString(properties.has_widget),
        toString(properties.notification_permission), toString(properties.selected_categories),
        toString(properties.cancelReason)
      FROM events WHERE ${timeFilter(start, end)} AND distinct_id = ${sqlQuote(userId)}
        AND event IN (${USER_EVENTS.map(sqlQuote).join(", ")})
        AND (startsWith(event, 'sw_') OR properties.app_environment = 'production')
      ORDER BY timestamp DESC LIMIT ${MAX_USER_EVENTS + 1}`, projectId, key),
      queryPostHog(`SELECT toString(properties.is_premium), toUnixTimestamp(timestamp)
        FROM events WHERE timestamp >= toDateTime('${sqlTime(FIRST_INSTRUMENTED_DAY)}', 'UTC')
          AND timestamp < toDateTime('${sqlTime(end)}', 'UTC') AND distinct_id = ${sqlQuote(userId)}
          AND event = 'app_state_snapshot' AND properties.app_environment = 'production'
        ORDER BY timestamp DESC LIMIT 1`, projectId, key),
      queryPostHog(`SELECT event, count()
        FROM events WHERE ${timeFilter(start, end)} AND distinct_id = ${sqlQuote(userId)}
          AND properties.app_environment = 'production'
          AND event IN ('quote_viewed', 'quote_swiped', 'quote_liked',
            'practice_session_started', 'app_opened_from_widget', 'app_opened_from_notification')
        GROUP BY event LIMIT 6`, projectId, key),
    ]);
    base.truncated = rows.length > MAX_USER_EVENTS;
    base.events = rows.slice(0, MAX_USER_EVENTS).map((row) => ({
      event: String(row[0]), at: toTimestamp(row[1]), screen: safeToken(row[2]),
      category: safeToken(row[3]), source: safeToken(row[4]), isPremium: boolOrNull(row[5]),
      hasWidget: boolOrNull(row[6]), notificationPermission: safeToken(row[7]),
      selectedCategories: safeCategories(row[8]), cancelReason: safeToken(row[9]),
    })).filter((event) => event.at);
    base.latestObservedAccess = boolOrNull(premiumSnapshots[0]?.[0]);
    base.accessObservedAt = premiumSnapshots[0]?.[1] == null ? null : toTimestamp(premiumSnapshots[0][1]);
    const totalKeys = {
      quote_viewed: "quoteViews", quote_swiped: "quoteSwipes", quote_liked: "quoteLikes",
      practice_session_started: "practiceStarts", app_opened_from_widget: "widgetOpens",
      app_opened_from_notification: "notificationOpens",
    } as const;
    for (const row of totals) {
      const key = totalKeys[String(row[0]) as keyof typeof totalKeys];
      if (key) base.totals[key] = toNumber(row[1]);
    }
    base.status = base.events.length ? "ready" : "empty";
    return base;
  } catch (error) {
    console.error("tap_and_swipe.glow_user_journey_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...base, status: "unavailable", note: "PostHog user journey is unavailable. Refresh to retry." };
  }
}

async function loadGlowProductReport(start: Date, end: Date, projectId: string, key: string): Promise<GlowProductReport> {
  const report = emptyGlowProductReport("empty", start, end);
  const window = timeFilter(start, end);
  const production = "properties.app_environment = 'production'";
  try {
    const [permissions, notificationSnapshots, widgetSnapshots, widgetAdds, widgetPrompts, features, reading, favorites, screens, categories, premiumUse, recentTrialCancels, recentPaidCancels] = await Promise.all([
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
          AND event IN (${GLOW_FEATURES.map((feature) => sqlQuote(feature.event)).join(", ")})
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
      queryPostHog(`SELECT toString(properties.is_premium), event, uniqExact(distinct_id), count()
        FROM events WHERE ${window} AND ${production}
          AND event IN (${GLOW_FEATURES.map((feature) => sqlQuote(feature.event)).join(", ")})
        GROUP BY toString(properties.is_premium), event LIMIT 50`, projectId, key),
      queryPostHog(`SELECT distinct_id, toUnixTimestamp(timestamp), toString(properties.cancelReason)
        FROM events WHERE ${window} AND event = 'sw_trial_cancelled'
          AND toString(properties.environment) = 'PRODUCTION'
        ORDER BY timestamp DESC LIMIT ${MAX_RECENT_CANCELLATIONS}`, projectId, key),
      queryPostHog(`SELECT distinct_id, toUnixTimestamp(timestamp), toString(properties.cancelReason)
        FROM events WHERE ${window} AND event = 'sw_subscription_cancelled'
          AND toString(properties.environment) = 'PRODUCTION'
        ORDER BY timestamp DESC LIMIT ${MAX_RECENT_CANCELLATIONS}`, projectId, key),
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
    }).filter((row) => /^[a-z_]{1,50}$/.test(row.screen));
    report.categories = categories.map((row) => ({ category: String(row[0] ?? ""), users: toNumber(row[1]) }))
      .filter((row) => /^[a-z0-9_-]{1,50}$/.test(row.category));
    report.premiumUse = (["premium", "free"] as const).map((status) => ({
      status,
      features: featureUsage(premiumUse.filter((row) => String(row[0]) === (status === "premium" ? "true" : "false"))
        .map((row) => ({ event: String(row[1] ?? ""), users: toNumber(row[2]), events: toNumber(row[3]) }))),
    }));

    const cancellations = (rows: unknown[][]): GlowCancellation[] => rows.map((row) => ({
      distinctId: String(row[0] ?? ""), timestamp: toTimestamp(row[1]), reason: String(row[2] ?? "") || null,
    })).filter((row) => row.distinctId && row.timestamp);
    const trialCancellations = cancellations(recentTrialCancels);
    const paidCancellations = cancellations(recentPaidCancels);
    const allCancellations = [...trialCancellations, ...paidCancellations];
    if (allCancellations.length > 0) {
      const earliest = Math.min(...allCancellations.map((row) => Date.parse(row.timestamp)));
      const historyStart = new Date(earliest - 7 * 86_400_000);
      const ids = [...new Set(allCancellations.map((row) => row.distinctId))];
      const history = await queryPostHog(`SELECT distinct_id, event, toUnixTimestamp(timestamp), toString(properties.screen)
        FROM events WHERE ${timeFilter(historyStart, end)}
          AND distinct_id IN (${ids.map(sqlQuote).join(", ")})
          AND event IN (${journeyEvents().map(sqlQuote).join(", ")})
          AND (event = 'sw_trial_start' OR ${production})
        ORDER BY timestamp DESC LIMIT ${MAX_HISTORY_ROWS}`, projectId, key);
      if (history.length >= MAX_HISTORY_ROWS) throw new Error("Cancellation activity exceeded the safe query limit");
      const activity: GlowCancellationActivity[] = history.map((row) => ({
        distinctId: String(row[0] ?? ""), event: String(row[1] ?? ""),
        timestamp: toTimestamp(row[2]), screen: String(row[3] ?? "") || null,
      }));
      report.cancellations = cancellationJourneys(
        trialCancellations, activity,
        (distinctId) => createHash("sha256").update(distinctId).digest("hex").slice(0, 12),
      );
      report.paidCancellations = cancellationJourneys(
        paidCancellations, activity,
        (distinctId) => createHash("sha256").update(distinctId).digest("hex").slice(0, 12),
      );
    }
    report.status = report.notifications.resolvedUsers || report.notifications.observedUsers || report.widgets.checkedUsers
      || report.features.some((feature) => feature.events > 0)
      || report.reading.sessions || report.screens.length || report.categories.length
      || report.cancellations.recentCount || report.paidCancellations.recentCount ? "ready" : "empty";
    return report;
  } catch (error) {
    console.error("tap_and_swipe.glow_product_analytics_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return emptyGlowProductReport("unavailable", start, end, "PostHog product analytics is unavailable. Refresh to retry.");
  }
}
