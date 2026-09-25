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
  trialStartedAt: string | null;
  lastAppActivityAt: string | null;
  activity: { event: string; label: string; count: number }[];
  recentActions: { at: string; label: string }[];
};

export type GlowCancellationReport = {
  recentCount: number;
  matchedCount: number;
  journeys: GlowCancellationJourney[];
  topPriorActions: GlowFeature[];
};

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
  premiumUse: { status: "premium" | "free"; features: GlowFeature[] }[];
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
]);

const JOURNEY_LABELS: Record<string, string> = {
  paywall_reached: "Paywall reached", paywall_viewed: "Paywall viewed",
  paywall_dismissed: "Paywall dismissed", paywall_purchase_attempted: "Purchase attempted",
  paywall_purchase_result: "Purchase result", practice_session_ended: "Practice ended",
  quote_reading_session: "Quote reading session", quote_unliked: "Quote unliked",
  premium_status_changed: "Access status changed", widget_removed_detected: "Widget removed",
  notification_permission_resolved: "Notification permission answered",
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
      trialStartedAt: trialStart?.timestamp ?? null,
      lastAppActivityAt: appActions.at(-1)?.timestamp ?? null,
      activity: featureUsage([...counts].map(([event, events]) => ({ event, users: 1, events })))
        .filter((feature) => feature.events > 0)
        .map(({ event, label, events }) => ({ event, label, count: events })),
      recentActions: appActions.slice(-12).reverse().map((event) => ({
        at: event.timestamp,
        label: event.event === "screen_time" && /^[a-z_]{1,50}$/.test(event.screen ?? "")
          ? `Screen: ${event.screen!.replaceAll("_", " ")}`
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
