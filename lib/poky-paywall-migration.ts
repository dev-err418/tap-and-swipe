import type { MobileAppExperiment, MobileAppExperimentSlice, MobileAppExperimentVariant } from "./mobile-app-analytics";

export const POKY_PAYWALL_ENGINE_START_MS = Date.parse("2026-09-24T11:37:23.000Z");
export const POKY_PAYWALL_ENGINE_ATTRIBUTE = "poky_paywall_engine_assignment_v1";

type Install = { appUserId: string; country: string; installedAt: number };
type Outcome = { appUserId: string; eventTs: number; name: string; netProceeds: number | null; originalTransactionId: string; transactionId: string; attributionTs: number; isRefund?: boolean };
type Facts = { startMs: number; endMs: number; installs: Install[]; events: Outcome[]; attributes: Map<string, Record<string, string>> };
type Engine = "superwall" | "native";
type Language = "en" | "es" | "de" | "fr";
type Assignment = { schema: 1; experiment: "poky_paywall_engine_v1"; variant: Engine; assignedAt: number; language: Language; environment: "production" };

const empty = (): MobileAppExperimentSlice => ({ users: 0, sessions: 0, installs: 0, completed: 0, trials: 0, converted: 0, paid: 0, proceeds: 0, installsD7: 0, proceedsD7: 0, eligibleD7: 0, retainedD7: 0, installsD14: 0, proceedsD14: 0, eligibleD14: 0, retainedD14: 0, installsD30: 0, proceedsD30: 0, eligibleD30: 0, retainedD30: 0 });
const variants = (): MobileAppExperimentVariant[] => [
  { ...empty(), key: "superwall", label: "Superwall", countries: {} },
  { ...empty(), key: "native", label: "Native", countries: {} },
];

function assignment(value: string | undefined): Assignment | null {
  if (!value) return null;
  let raw: Record<string, unknown>;
  try { raw = JSON.parse(value) as Record<string, unknown>; } catch { return null; }
  if (raw.schema !== 1 || raw.experiment !== "poky_paywall_engine_v1" ||
      (raw.variant !== "superwall" && raw.variant !== "native") ||
      !["en", "es", "de", "fr"].includes(String(raw.language)) ||
      raw.environment !== "production" || typeof raw.assignedAt !== "number" ||
      !Number.isFinite(raw.assignedAt)) return null;
  return raw as Assignment;
}

/** The date picker selects new randomized assignments. Old version cohorts and
 * subscriptions that started before assignment never enter this experiment.
 */
export function pokyPaywallMigrationExperiment(facts: Facts, asOf = Date.now()): MobileAppExperiment {
  const overall = variants();
  const languageComparisons = [
    { language: "es", label: "🇪🇸 Spanish APPU", variants: variants() },
    { language: "en", label: "🇬🇧 English APPU", variants: variants() },
    { language: "de", label: "🇩🇪 German APPU", variants: variants() },
    { language: "fr", label: "🇫🇷 French APPU", variants: variants() },
  ];
  const installs = new Map<string, Install>();
  for (const install of facts.installs) {
    if (!install.appUserId || !Number.isFinite(install.installedAt)) continue;
    if ((installs.get(install.appUserId)?.installedAt ?? Infinity) > install.installedAt) installs.set(install.appUserId, install);
  }
  const cohort = new Map<string, { assignment: Assignment; slices: MobileAppExperimentSlice[] }>();
  for (const [appUserId, attributes] of facts.attributes) {
    const assigned = assignment(attributes[POKY_PAYWALL_ENGINE_ATTRIBUTE]);
    if (!assigned || assigned.assignedAt < Math.max(facts.startMs, POKY_PAYWALL_ENGINE_START_MS) ||
        assigned.assignedAt >= facts.endMs || assigned.assignedAt > asOf) continue;
    const arm = assigned.variant === "superwall" ? 0 : 1;
    const country = installs.get(appUserId)?.country ?? "unknown";
    const language = languageComparisons.find((row) => row.language === assigned.language)!;
    const slices = [overall[arm], language.variants[arm]].flatMap((row) => [row, row.countries[country] ??= empty()]);
    for (const slice of slices) { slice.users++; slice.installs++; }
    cohort.set(appUserId, { assignment: assigned, slices });
  }

  // A renewal or refund belongs to this test only when its original purchase
  // began after this user's assignment. This excludes old Superwall conversions.
  const eligibleOriginals = new Set<string>();
  for (const event of facts.events) {
    const user = cohort.get(event.appUserId);
    if (!user || !event.originalTransactionId || !Number.isFinite(event.eventTs) ||
        event.eventTs < user.assignment.assignedAt || event.eventTs > asOf) continue;
    if (!event.isRefund && (event.name === "initial_purchase" || event.name === "non_renewing_purchase")) {
      eligibleOriginals.add(`${event.appUserId}|${event.originalTransactionId}`);
    }
  }
  const unique = new Map<string, Outcome>();
  for (const event of facts.events) {
    const user = cohort.get(event.appUserId);
    if (!user || !eligibleOriginals.has(`${event.appUserId}|${event.originalTransactionId}`) ||
        !event.transactionId || !Number.isFinite(event.eventTs) ||
        event.eventTs < user.assignment.assignedAt || event.eventTs > asOf) continue;
    if (!event.isRefund && !["initial_purchase", "renewal", "non_renewing_purchase", "cancellation"].includes(event.name)) continue;
    if (event.name === "cancellation" && (event.netProceeds ?? 0) >= 0) continue;
    const key = `${event.appUserId}|${event.originalTransactionId}|${event.transactionId}|${event.name}|${(event.netProceeds ?? 0) < 0}`;
    if ((unique.get(key)?.attributionTs ?? -Infinity) < event.attributionTs) unique.set(key, event);
  }
  const paid = new Set<string>();
  const userProceeds = new Map<string, number>();
  for (const event of unique.values()) {
    const user = cohort.get(event.appUserId);
    if (!user || event.netProceeds == null || !Number.isFinite(event.netProceeds)) continue;
    userProceeds.set(event.appUserId, (userProceeds.get(event.appUserId) ?? 0) + event.netProceeds);
    const firstPaid = event.netProceeds > 0 && !paid.has(event.appUserId);
    if (firstPaid) paid.add(event.appUserId);
    for (const slice of user.slices) {
      slice.proceeds += event.netProceeds;
      if (firstPaid) slice.paid++;
    }
  }
  const squaredProceeds = new Map<MobileAppExperimentSlice, number>();
  for (const [appUserId, user] of cohort) {
    const value = userProceeds.get(appUserId) ?? 0;
    for (const slice of user.slices) {
      squaredProceeds.set(slice, (squaredProceeds.get(slice) ?? 0) + value * value);
    }
  }
  for (const [slice, sumOfSquares] of squaredProceeds) {
    slice.proceedsVariance = slice.users > 1
      ? Math.max(0, (sumOfSquares - slice.proceeds * slice.proceeds / slice.users) / (slice.users - 1))
      : 0;
  }
  return {
    id: "poky-superwall-vs-native",
    title: "Paywalls · Superwall vs native",
    subtitle: "Fresh 50/50 assignment · all four languages · new subscriptions only",
    variants: overall, languageComparisons,
    languageVariants: Object.fromEntries(languageComparisons.map((row) => [row.language, row.variants])),
    scoreMetrics: ["appu", "download_paid"],
    randomized: true, showUsers: true, showInstalls: false,
    paidRateLabel: "Assigned → paid",
  };
}
