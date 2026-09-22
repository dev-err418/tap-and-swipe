import type { MobileAppExperiment, MobileAppExperimentSlice, MobileAppExperimentVariant } from "./mobile-app-analytics";

type Install = { appUserId: string; country: string; appVersion: string; language: string; installedAt: number };
type Outcome = { appUserId: string; eventTs: number; name: string; netProceeds: number | null; originalTransactionId: string; transactionId: string; attributionTs: number };
type Facts = { startMs: number; endMs: number; legacyStartMs?: number; installs: Install[]; events: Outcome[]; attributes: Map<string, Record<string, string>> };

const empty = (): MobileAppExperimentSlice => ({ users: 0, sessions: 0, installs: 0, completed: 0, trials: 0, converted: 0, paid: 0, proceeds: 0, installsD7: 0, proceedsD7: 0, eligibleD7: 0, retainedD7: 0, installsD14: 0, proceedsD14: 0, eligibleD14: 0, retainedD14: 0, installsD30: 0, proceedsD30: 0, eligibleD30: 0, retainedD30: 0 });
const variants = (): MobileAppExperimentVariant[] => [
  { ...empty(), key: "legacy", label: "Superwall", countries: {} },
  { ...empty(), key: "native", label: "Native", countries: {} },
];

/** Native UI shipped in Poky 1.1.2. Keep the install cohort stable after upgrades. */
export function pokyPaywallEngine(version: string): "legacy" | "native" | null {
  const match = version.trim().match(/^(\d+)\.(\d+)(?:\.(\d+))?(?:[+\-].*)?$/);
  if (!match) return null;
  const value = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
  const native = [1, 1, 2];
  for (let i = 0; i < native.length; i++) {
    if (value[i] !== native[i]) return value[i] > native[i] ? "native" : "legacy";
  }
  return "native";
}

/** Language, never country. Known unsupported locales use Poky's English fallback.
 * Missing/malformed telemetry is unknown, not an invented English install.
 */
export function pokyComparisonLanguage(value: string): "en" | "es" | null {
  const code = value.trim().toLowerCase().split(/[-_]/)[0];
  if (!/^[a-z]{2,3}$/.test(code) || ["und", "fr", "de"].includes(code)) return null;
  return code === "es" ? "es" : "en";
}

/** Historical version cohorts, not a randomized assignment. Total APPU includes
 * all observed proceeds (main/recovery, renewals, refunds) per installed user.
 */
export function pokyPaywallMigrationExperiment(facts: Facts, asOf = Date.now()): MobileAppExperiment {
  const overall = variants();
  const languageComparisons = [
    { language: "es", label: "🇪🇸 Spanish total APPU", variants: variants() },
    { language: "en", label: "🇬🇧 English total APPU", variants: variants() },
  ];
  const cohort = new Map<string, { install: Install; arm: number; language: string }>();
  // Resolve first before filtering, so duplicate/later install telemetry cannot move a user.
  const firstInstalls = new Map<string, Install>();
  for (const install of facts.installs) {
    if (!install.appUserId || !Number.isFinite(install.installedAt)) continue;
    if ((firstInstalls.get(install.appUserId)?.installedAt ?? Infinity) > install.installedAt) firstInstalls.set(install.appUserId, install);
  }
  for (const install of firstInstalls.values()) {
    if (install.installedAt >= facts.endMs || install.installedAt > asOf) continue;
    const environment = facts.attributes.get(install.appUserId)?.poky_tracking_environment?.trim().toLowerCase();
    if (environment && environment !== "production") continue;
    const engine = pokyPaywallEngine(install.appVersion);
    const language = pokyComparisonLanguage(install.language);
    if (!engine || !language) continue;
    if (install.installedAt < (engine === "legacy" ? facts.legacyStartMs ?? facts.startMs : facts.startMs)) continue;
    cohort.set(install.appUserId, { install, arm: engine === "native" ? 1 : 0, language });
  }
  const slices = (user: NonNullable<ReturnType<typeof cohort.get>>) => {
    const rows = [overall[user.arm], languageComparisons.find((row) => row.language === user.language)!.variants[user.arm]];
    return rows.flatMap((row) => [row, row.countries[user.install.country] ??= empty()]);
  };
  for (const user of cohort.values()) for (const slice of slices(user)) { slice.users++; slice.installs++; }

  const unique = new Map<string, Outcome>();
  for (const event of facts.events) {
    const user = cohort.get(event.appUserId);
    if (!user || !Number.isFinite(event.eventTs) || event.eventTs < user.install.installedAt || event.eventTs > asOf) continue;
    if (!event.transactionId || !["initial_purchase", "renewal", "non_renewing_purchase", "cancellation"].includes(event.name)) continue;
    if (event.name === "cancellation" && (event.netProceeds ?? 0) >= 0) continue;
    const key = `${event.originalTransactionId}|${event.transactionId}|${(event.netProceeds ?? 0) < 0}`;
    if ((unique.get(key)?.attributionTs ?? -Infinity) < event.attributionTs) unique.set(key, event);
  }
  const paid = new Set<string>();
  for (const event of unique.values()) {
    const user = cohort.get(event.appUserId);
    if (!user || event.eventTs < user.install.installedAt || event.eventTs > asOf || event.netProceeds == null || !Number.isFinite(event.netProceeds)) continue;
    const firstPaid = event.netProceeds > 0 && !paid.has(event.appUserId);
    if (firstPaid) paid.add(event.appUserId);
    for (const slice of slices(user)) {
      slice.proceeds += event.netProceeds;
      if (firstPaid) slice.paid++;
    }
  }
  return {
    id: "poky-superwall-vs-native",
    title: "Conversion rate · Superwall vs native",
    subtitle: "EN + ES · installs on 1.1.2+ vs earlier · historical cohorts, not randomized · total proceeds to date",
    variants: overall, languageComparisons, scoreMetrics: ["download_paid"], randomized: false,
    planningNote: `Historical cohorts, not randomized. Superwall installs from ${new Date(facts.legacyStartMs ?? facts.startMs).toISOString().slice(0, 10)}; native installs from ${new Date(facts.startMs).toISOString().slice(0, 10)}. Proceeds follow each cohort through today, so older users have more time to pay. Planning is an indicative sample estimate, not proof of a causal winner.`,
  };
}
