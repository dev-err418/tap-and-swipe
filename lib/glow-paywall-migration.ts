import type { MobileAppExperiment, MobileAppExperimentSlice, MobileAppExperimentVariant } from "./mobile-app-analytics";
import { glowExperimentStart } from "./glow-experiment-window";
import { isMobileMoneyEvent } from "./mobile-app-money";

export const GLOW_SUPERWALL_HISTORY_START_MS = glowExperimentStart(0) - 30 * 86_400_000;

type Install = { appUserId: string; country: string; appVersion: string; installedAt: number };
type Outcome = {
  appUserId: string; eventTs: number; name: string; netProceeds: number | null;
  originalTransactionId: string; transactionId: string; attributionTs: number;
  periodType: string; isTrialConversion: boolean;
};
type Facts = { startMs: number; endMs: number; installs: Install[]; events: Outcome[] };

const empty = (): MobileAppExperimentSlice => ({ users: 0, sessions: 0, installs: 0, completed: 0, trials: 0, converted: 0, paid: 0, proceeds: 0, installsD7: 0, proceedsD7: 0, eligibleD7: 0, retainedD7: 0, installsD14: 0, proceedsD14: 0, eligibleD14: 0, retainedD14: 0, installsD30: 0, proceedsD30: 0, eligibleD30: 0, retainedD30: 0 });

/** Keep the install version fixed even if a historical user later upgrades. */
export function glowPaywallEngine(version: string): "legacy" | "native" | null {
  const match = version.trim().match(/^(\d+)\.(\d+)(?:\.(\d+))?(?:[+\-].*)?$/);
  if (!match) return null;
  const parts = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
  for (const [index, minimum] of [1, 7, 0].entries()) {
    if (parts[index] !== minimum) return parts[index] > minimum ? "native" : "legacy";
  }
  return "native";
}

/** Historical install cohorts, with all linked outcomes followed through today. */
export function glowPaywallMigrationExperiment(facts: Facts, asOf = Date.now()): MobileAppExperiment {
  const variants: MobileAppExperimentVariant[] = [
    { ...empty(), key: "legacy", label: "Superwall web", countries: {} },
    { ...empty(), key: "native", label: "Native paywall", countries: {} },
  ];
  const firstInstalls = new Map<string, Install>();
  for (const install of facts.installs) {
    if (!install.appUserId || !Number.isFinite(install.installedAt)) continue;
    if ((firstInstalls.get(install.appUserId)?.installedAt ?? Infinity) > install.installedAt) firstInstalls.set(install.appUserId, install);
  }
  const cohort = new Map<string, { install: Install; slices: MobileAppExperimentSlice[] }>();
  for (const install of firstInstalls.values()) {
    const engine = glowPaywallEngine(install.appVersion);
    if (!engine || install.installedAt >= facts.endMs || install.installedAt > asOf) continue;
    const from = engine === "legacy" ? GLOW_SUPERWALL_HISTORY_START_MS : glowExperimentStart(facts.startMs);
    if (install.installedAt < from) continue;
    const variant = variants[engine === "legacy" ? 0 : 1];
    const slices = [variant, variant.countries[install.country] ??= empty()];
    for (const slice of slices) { slice.users++; slice.installs++; }
    cohort.set(install.appUserId, { install, slices });
  }

  const unique = new Map<string, Outcome>();
  for (const event of facts.events) {
    const user = cohort.get(event.appUserId);
    if (!user || !Number.isFinite(event.eventTs) || event.eventTs < user.install.installedAt || event.eventTs > asOf) continue;
    if (!isMobileMoneyEvent(event)) continue;
    const key = `${event.originalTransactionId}|${event.transactionId || `${event.name}|${event.eventTs}`}|${(event.netProceeds ?? 0) < 0}`;
    const previous = unique.get(key);
    if (!previous || event.attributionTs > previous.attributionTs) unique.set(key, event);
  }
  const trials = new Set<string>();
  const converted = new Set<string>();
  const paid = new Set<string>();
  for (const event of unique.values()) {
    const user = cohort.get(event.appUserId)!;
    const firstTrial = event.name === "initial_purchase" && event.periodType === "trial" && !trials.has(event.appUserId);
    const firstConversion = event.name === "renewal" && event.isTrialConversion && !converted.has(event.appUserId);
    const firstPaid = (event.netProceeds ?? 0) > 0 && !paid.has(event.appUserId);
    if (firstTrial) trials.add(event.appUserId);
    if (firstConversion) converted.add(event.appUserId);
    if (firstPaid) paid.add(event.appUserId);
    for (const slice of user.slices) {
      if (event.netProceeds != null && Number.isFinite(event.netProceeds)) slice.proceeds += event.netProceeds;
      if (firstTrial) slice.trials++;
      if (firstConversion) slice.converted++;
      if (firstPaid) slice.paid++;
    }
  }
  return {
    id: "glow-native-paywall",
    title: "Paywalls · Superwall vs native",
    subtitle: "1.7.0+ vs earlier · historical install cohorts",
    scoreMetrics: ["appu", "download_paid"], showTrials: true, randomized: false, variants,
    planningNote: `Historical cohorts, not randomized. Superwall installs from ${new Date(GLOW_SUPERWALL_HISTORY_START_MS).toISOString().slice(0, 10)}; native installs from ${new Date(glowExperimentStart(facts.startMs)).toISOString().slice(0, 10)}. Proceeds follow each cohort through today, so older users have more time to pay.`,
  };
}
