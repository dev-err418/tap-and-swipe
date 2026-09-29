export const VERSY_PAYWALL_PLACEMENTS = [
  "onboarding_short_prayer",
  "onboarding_short_prayer_no_trial",
  "onboarding_bible_widget",
  "home_crown",
  "app_open",
  "settings_upgrade",
  "categories_upgrade",
  "categories_upgrade_top_card",
  "themes_upgrade",
  "own_affirmations_upgrade",
  "icons_upgrade",
  "prayer_upgrade",
] as const;

export type VersyPlacementEvent = {
  userId: string;
  placement: string;
  onboardingVariant?: string;
  reaches: number;
  views: number;
  attempts: number;
  purchases: number;
  firstView: number;
  lastPurchase: number;
};

export type VersyPlacementRow = {
  placement: string;
  reached: number;
  viewed: number;
  attempted: number;
  purchased: number;
};

export type VersyPlacementReport = {
  status: "ready" | "empty" | "setup_required" | "unavailable" | "limited";
  windowStart: string;
  windowEnd: string;
  rows: VersyPlacementRow[];
  onboarding: VersyPlacementRow[];
  note?: string;
};

export function summarizeVersyPlacements(events: VersyPlacementEvent[], windowStart: string, windowEnd: string): VersyPlacementReport {
  const groups = new Map<string, { reached: Set<string>; viewed: Set<string>; attempted: Set<string>; purchased: Set<string> }>();
  const onboardingGroups = new Map<string, { reached: Set<string>; viewed: Set<string>; attempted: Set<string>; purchased: Set<string> }>();
  const add = (group: { reached: Set<string>; viewed: Set<string>; attempted: Set<string>; purchased: Set<string> }, event: VersyPlacementEvent) => {
    // The embedded Bible Widget paywall has no separate reach hook. An actual view proves reach.
    if (event.reaches > 0 || event.views > 0) group.reached.add(event.userId);
    if (event.views > 0) group.viewed.add(event.userId);
    if (event.attempts > 0) group.attempted.add(event.userId);
    if (event.purchases > 0 && event.views > 0 && event.lastPurchase >= event.firstView) group.purchased.add(event.userId);
  };
  for (const event of events) {
    if (!event.userId || !/^[a-z0-9_]{1,80}$/.test(event.placement)) continue;
    const placement = event.placement === "onboarding_short_prayer" && event.onboardingVariant === "bible_widget"
      ? "onboarding_bible_widget" : event.placement;
    const group = groups.get(placement) ?? {
      reached: new Set<string>(), viewed: new Set<string>(), attempted: new Set<string>(), purchased: new Set<string>(),
    };
    add(group, event);
    groups.set(placement, group);
    const flow = placement === "onboarding_bible_widget" ? "Bible Widget onboarding"
      : placement === "onboarding_short_prayer" || placement === "onboarding_short_prayer_no_trial" ? "Prayer journey onboarding" : null;
    if (flow) {
      const onboardingGroup = onboardingGroups.get(flow) ?? {
        reached: new Set<string>(), viewed: new Set<string>(), attempted: new Set<string>(), purchased: new Set<string>(),
      };
      add(onboardingGroup, event);
      onboardingGroups.set(flow, onboardingGroup);
    }
  }
  const placements = [...new Set([...VERSY_PAYWALL_PLACEMENTS, ...groups.keys()])];
  const rows = placements.map((placement) => {
    const group = groups.get(placement);
    return { placement, reached: group?.reached.size ?? 0, viewed: group?.viewed.size ?? 0,
      attempted: group?.attempted.size ?? 0, purchased: group?.purchased.size ?? 0 };
  });
  const onboarding = ["Prayer journey onboarding", "Bible Widget onboarding"].map((placement) => {
    const group = onboardingGroups.get(placement);
    return { placement, reached: group?.reached.size ?? 0, viewed: group?.viewed.size ?? 0,
      attempted: group?.attempted.size ?? 0, purchased: group?.purchased.size ?? 0 };
  });
  return { status: rows.some((row) => row.reached || row.viewed || row.attempted || row.purchased) ? "ready" : "empty",
    windowStart, windowEnd, rows, onboarding };
}
