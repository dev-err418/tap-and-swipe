export const GLOW_FEATURES = [
  { event: "quote_viewed", label: "Quotes viewed" },
  { event: "quote_swiped", label: "Quotes swiped" },
  { event: "quote_liked", label: "Quotes liked" },
  { event: "practice_session_started", label: "Practice started" },
  { event: "practice_session_completed", label: "Practice completed" },
  { event: "categories_changed", label: "Categories changed" },
  { event: "widget_prompt_viewed", label: "Widget prompt viewed" },
  { event: "widget_prompt_action", label: "Widget prompt tapped" },
  { event: "widget_installed_detected", label: "Widget added" },
  { event: "app_opened_from_widget", label: "Widget opens" },
  { event: "app_opened_from_notification", label: "Notification opens" },
  { event: "winback_notification_sent", label: "Win-back sent" },
  { event: "winback_notification_opened", label: "Win-back opened" },
  { event: "winback_paywall_viewed", label: "Win-back paywall" },
  { event: "winback_purchase_completed", label: "Win-back purchase" },
] as const;

export type GlowFeature = {
  event: string;
  label: string;
  users: number;
  events: number;
  eventsPerUser: number | null;
};

export type GlowCancellationActivity = {
  distinctId: string;
  event: string;
  timestamp: string;
  screen?: string | null;
  appVersion?: string | null;
  reason?: string | null;
};

export type GlowCancellation = {
  distinctId: string;
  timestamp: string;
  reason?: string | null;
};

export type GlowCancellationJourney = {
  user: string;
  cancelledAt: string;
  reason: string | null;
  selfReportedReason: string | null;
  trialStartedAt: string | null;
  lastAppActivityAt: string | null;
  lastAppVersion: string | null;
  activity: { event: string; label: string; count: number }[];
  recentActions: { at: string; label: string }[];
};

export type GlowCancellationReport = {
  recentCount: number;
  matchedCount: number;
  journeys: GlowCancellationJourney[];
  topPriorActions: GlowFeature[];
};

export const TRIAL_COMPARISON_EVENTS = [
  "quote_viewed", "quote_swiped", "quote_liked", "practice_session_started",
  "widget_installed_detected", "app_opened_from_widget", "app_opened_from_notification",
] as const;

export type GlowTrialStart = { distinctId: string; timestamp: string; productId: string };
export type GlowTrialEvent = { distinctId: string; timestamp: string; event: string };
export type GlowTrialComparison = {
  status: "waiting" | "ready" | "truncated" | "unavailable";
  sampledStarts: number;
  eligibleStarts: number;
  earlyCancelled: number;
  matchedCancelled: number;
  matchedContinued: number;
  features: { event: string; label: string; cancelledAdoption: number | null;
    continuedAdoption: number | null; cancelledPerStarter: number | null;
    continuedPerStarter: number | null }[];
};

export function emptyTrialComparison(status: GlowTrialComparison["status"] = "waiting"): GlowTrialComparison {
  return { status, sampledStarts: 0, eligibleStarts: 0, earlyCancelled: 0,
    matchedCancelled: 0, matchedContinued: 0, features: [] };
}

/** Compare fixed early exposure, then a later cancellation outcome, within start week and product. */
export function trialComparison(starts: GlowTrialStart[], events: GlowTrialEvent[], asOf: Date): GlowTrialComparison {
  const result = emptyTrialComparison();
  const latest = new Map<string, GlowTrialStart>();
  for (const start of starts) {
    const at = Date.parse(start.timestamp);
    if (!start.distinctId || !Number.isFinite(at) || at > asOf.getTime() - 96 * 3_600_000) continue;
    const prior = latest.get(start.distinctId);
    if (!prior || at > Date.parse(prior.timestamp)) latest.set(start.distinctId, start);
  }
  result.sampledStarts = latest.size;
  const rows = [...latest.values()].map((start) => {
    const at = Date.parse(start.timestamp);
    const week = new Date(at);
    week.setUTCHours(0, 0, 0, 0);
    week.setUTCDate(week.getUTCDate() - ((week.getUTCDay() + 6) % 7));
    const activity = events.filter((event) => event.distinctId === start.distinctId);
    const earlyCancelled = activity.some((event) => event.event === "sw_trial_cancelled"
      && Date.parse(event.timestamp) >= at && Date.parse(event.timestamp) < at + 12 * 3_600_000);
    const cancelled = activity.some((event) => event.event === "sw_trial_cancelled"
      && Date.parse(event.timestamp) >= at + 12 * 3_600_000
      && Date.parse(event.timestamp) < at + 72 * 3_600_000);
    const counts = new Map<string, number>();
    for (const event of activity) {
      const time = Date.parse(event.timestamp);
      if (time < at || time >= at + 12 * 3_600_000 || !TRIAL_COMPARISON_EVENTS.includes(event.event as typeof TRIAL_COMPARISON_EVENTS[number])) continue;
      counts.set(event.event, (counts.get(event.event) ?? 0) + 1);
    }
    return { stratum: `${week.toISOString().slice(0, 10)}:${start.productId}`,
      productId: start.productId, earlyCancelled, cancelled, counts };
  });
  result.earlyCancelled = rows.filter((row) => row.earlyCancelled).length;
  const eligible = rows.filter((row) => !row.earlyCancelled && row.productId !== "unknown");
  result.eligibleStarts = eligible.length;
  const groups = new Map<string, typeof rows>();
  for (const row of eligible) groups.set(row.stratum, [...(groups.get(row.stratum) ?? []), row]);
  const matched = [...groups.values()].filter((group) => group.some((row) => row.cancelled)
    && group.some((row) => !row.cancelled)).flat();
  const cancelled = matched.filter((row) => row.cancelled);
  const continued = matched.filter((row) => !row.cancelled);
  result.matchedCancelled = cancelled.length;
  result.matchedContinued = continued.length;
  result.status = cancelled.length && continued.length ? "ready" : "waiting";
  if (result.status === "ready") {
    result.features = TRIAL_COMPARISON_EVENTS.map((event) => {
      const label = GLOW_FEATURES.find((feature) => feature.event === event)?.label ?? event;
      const count = (rows: typeof cancelled) => rows.reduce((sum, row) => sum + (row.counts.get(event) ?? 0), 0);
      const users = (rows: typeof cancelled) => rows.filter((row) => (row.counts.get(event) ?? 0) > 0).length;
      return { event, label, cancelledAdoption: rate(users(cancelled), cancelled.length),
        continuedAdoption: rate(users(continued), continued.length),
        cancelledPerStarter: rate(count(cancelled), cancelled.length),
        continuedPerStarter: rate(count(continued), continued.length) };
    });
  }
  return result;
}

export type GlowProductReport = {
  status: "ready" | "empty" | "unavailable" | "setup_required";
  asOf: string;
  windowStart: string;
  windowEnd: string;
  notifications: {
    requestedUsers: number;
    resolvedUsers: number;
    allowedUsers: number;
    deniedUsers: number;
    allowRate: number | null;
    observedUsers: number;
    observedDecidedUsers: number;
    observedAllowedUsers: number;
    observedAllowRate: number | null;
    remindersEnabledUsers: number;
    remindersEnabledRate: number | null;
  };
  widgets: {
    checkedUsers: number;
    seenInstalledUsers: number;
    seenInstalledRate: number | null;
    detectedAdds: number;
    sources: { source: string; users: number; promptedUsers: number }[];
  };
  features: GlowFeature[];
  reading: { users: number; sessions: number; quoteViewsPerSession: number | null;
    swipesPerSession: number | null; secondsPerSession: number | null };
  favorites: { observedUsers: number; usersWithFavorites: number; averageSaved: number | null;
    adoptionRate: number | null };
  screens: { screen: string; users: number; totalSeconds: number; secondsPerUser: number | null }[];
  categories: { category: string; users: number }[];
  premiumUse: { status: "trial" | "paid" | "free" | "unknown"; features: GlowFeature[] }[];
  feedback: { reason: string; users: number }[];
  trialComparison: GlowTrialComparison;
  cancellations: GlowCancellationReport;
  paidCancellations: GlowCancellationReport;
  note?: string;
};

export function emptyGlowProductReport(
  status: GlowProductReport["status"], windowStart: Date, windowEnd: Date, note?: string,
): GlowProductReport {
  return {
    status,
    asOf: new Date().toISOString(),
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    notifications: { requestedUsers: 0, resolvedUsers: 0, allowedUsers: 0, deniedUsers: 0, allowRate: null,
      observedUsers: 0, observedDecidedUsers: 0, observedAllowedUsers: 0,
      observedAllowRate: null, remindersEnabledUsers: 0, remindersEnabledRate: null },
    widgets: { checkedUsers: 0, seenInstalledUsers: 0, seenInstalledRate: null, detectedAdds: 0, sources: [] },
    features: [],
    reading: { users: 0, sessions: 0, quoteViewsPerSession: null, swipesPerSession: null, secondsPerSession: null },
    favorites: { observedUsers: 0, usersWithFavorites: 0, averageSaved: null, adoptionRate: null },
    screens: [],
    categories: [],
    premiumUse: [],
    feedback: [],
    trialComparison: emptyTrialComparison(),
    cancellations: { recentCount: 0, matchedCount: 0, journeys: [], topPriorActions: [] },
    paidCancellations: { recentCount: 0, matchedCount: 0, journeys: [], topPriorActions: [] },
    note,
  };
}

export function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

export function featureUsage(rows: { event: string; users: number; events: number }[]): GlowFeature[] {
  const byEvent = new Map(rows.map((row) => [row.event, row]));
  return GLOW_FEATURES.map(({ event, label }) => {
    const row = byEvent.get(event);
    const users = row?.users ?? 0;
    const events = row?.events ?? 0;
    return { event, label, users, events, eventsPerUser: rate(events, users) };
  }).sort((a, b) => b.users - a.users || b.events - a.events);
}

const JOURNEY_EVENTS = new Set<string>([
  ...GLOW_FEATURES.map((feature) => feature.event),
  "notification_permission_resolved",
  "paywall_reached", "paywall_viewed", "paywall_dismissed",
  "paywall_purchase_attempted", "paywall_purchase_result",
  "practice_session_ended", "quote_reading_session", "quote_unliked",
  "premium_status_changed", "widget_removed_detected",
  "screen_time",
  "sw_trial_start",
  "subscription_feedback_submitted",
]);

const JOURNEY_LABELS: Record<string, string> = {
  paywall_reached: "Paywall reached", paywall_viewed: "Paywall viewed",
  paywall_dismissed: "Paywall dismissed", paywall_purchase_attempted: "Purchase attempted",
  paywall_purchase_result: "Purchase result", practice_session_ended: "Practice ended",
  quote_reading_session: "Quote reading session", quote_unliked: "Quote unliked",
  premium_status_changed: "Access status changed", widget_removed_detected: "Widget removed",
  notification_permission_resolved: "Notification permission answered",
  subscription_feedback_submitted: "Subscription feedback shared",
};

export function journeyEvents(): string[] { return [...JOURNEY_EVENTS]; }

/** PostHog and Superwall use the same Superwall UUID when their identity join succeeds. */
export function cancellationJourneys(
  cancellations: GlowCancellation[],
  events: GlowCancellationActivity[],
  pseudonym: (distinctId: string) => string,
): GlowCancellationReport {
  const latest = new Map<string, GlowCancellation>();
  for (const cancellation of cancellations) {
    const at = Date.parse(cancellation.timestamp);
    if (!cancellation.distinctId || !Number.isFinite(at)) continue;
    const existing = latest.get(cancellation.distinctId);
    if (!existing || at > Date.parse(existing.timestamp)) latest.set(cancellation.distinctId, cancellation);
  }
  const selected = [...latest.values()].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  const feedback = new Map<string, GlowCancellationActivity>();
  for (const event of events) {
    const cancellation = latest.get(event.distinctId);
    if (!cancellation || event.event !== "subscription_feedback_submitted" || !event.reason) continue;
    const delta = Date.parse(event.timestamp) - Date.parse(cancellation.timestamp);
    if (!Number.isFinite(delta) || delta < -7 * 86_400_000 || delta > 14 * 86_400_000) continue;
    const prior = feedback.get(event.distinctId);
    if (!prior || Math.abs(delta) < Math.abs(Date.parse(prior.timestamp) - Date.parse(cancellation.timestamp))) {
      feedback.set(event.distinctId, event);
    }
  }
  const byUser = new Map<string, GlowCancellationActivity[]>();
  for (const event of events) {
    if (!JOURNEY_EVENTS.has(event.event)) continue;
    const cancellation = latest.get(event.distinctId);
    if (!cancellation) continue;
    const at = Date.parse(event.timestamp);
    const cancelledAt = Date.parse(cancellation.timestamp);
    if (!Number.isFinite(at) || at >= cancelledAt || at < cancelledAt - 7 * 86_400_000) continue;
    const list = byUser.get(event.distinctId) ?? [];
    list.push(event);
    byUser.set(event.distinctId, list);
  }

  const priorUsers = new Map<string, Set<string>>();
  const priorEvents = new Map<string, number>();
  const journeys = selected.map((cancellation) => {
    const prior = (byUser.get(cancellation.distinctId) ?? []).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    const appActions = prior.filter((event) => event.event !== "sw_trial_start");
    const counts = new Map<string, number>();
    for (const event of appActions) {
      counts.set(event.event, (counts.get(event.event) ?? 0) + 1);
      const users = priorUsers.get(event.event) ?? new Set<string>();
      users.add(cancellation.distinctId);
      priorUsers.set(event.event, users);
      priorEvents.set(event.event, (priorEvents.get(event.event) ?? 0) + 1);
    }
    const trialStart = prior.find((event) => event.event === "sw_trial_start");
    return {
      user: pseudonym(cancellation.distinctId),
      cancelledAt: cancellation.timestamp,
      reason: cancellation.reason || null,
      selfReportedReason: feedback.get(cancellation.distinctId)?.reason ?? null,
      trialStartedAt: trialStart?.timestamp ?? null,
      lastAppActivityAt: appActions.at(-1)?.timestamp ?? null,
      lastAppVersion: /^[a-zA-Z0-9._-]{1,40}$/.test(appActions.at(-1)?.appVersion ?? "")
        ? appActions.at(-1)!.appVersion! : null,
      activity: featureUsage([...counts].map(([event, events]) => ({ event, users: 1, events })))
        .filter((feature) => feature.events > 0)
        .map(({ event, label, events }) => ({ event, label, count: events })),
      recentActions: appActions.slice(-12).reverse().map((event) => ({
        at: event.timestamp,
        label: event.event === "screen_time" && /^[a-zA-Z_]{1,50}$/.test(event.screen ?? "")
          ? `Screen: ${event.screen!.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ")}`
          : GLOW_FEATURES.find((feature) => feature.event === event.event)?.label
            ?? JOURNEY_LABELS[event.event] ?? "App activity",
      })),
    };
  });
  return {
    recentCount: selected.length,
    matchedCount: journeys.filter((journey) => journey.lastAppActivityAt !== null).length,
    journeys,
    topPriorActions: featureUsage([...priorEvents].map(([event, events]) => ({
      event, events, users: priorUsers.get(event)?.size ?? 0,
    }))).filter((feature) => feature.users > 0),
  };
}
