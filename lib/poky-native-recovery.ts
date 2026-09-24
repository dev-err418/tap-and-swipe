import type { MobileAppExperiment, MobileAppExperimentSlice, MobileAppExperimentVariant } from "./mobile-app-analytics";
import { firstRecoveryAssignments, parsePaywallAttributes, type PaywallAttribute } from "./native-paywall-analytics";

export const POKY_NATIVE_RECOVERY_KEYS = ["en", "de", "es", "fr"].map((language) => `gp1_a_poky_native_recovery_v2_${language}`);
type Outcome = { appUserId: string; eventTs: number; name: string; netProceeds: number | null; originalTransactionId: string; transactionId: string; attributionTs: number };
const DAY = 86_400_000;
const empty = (): MobileAppExperimentSlice => ({ users: 0, sessions: 0, installs: 0, completed: 0, trials: 0, converted: 0, paid: 0, proceeds: 0, installsD7: 0, proceedsD7: 0, eligibleD7: 0, retainedD7: 0, installsD14: 0, proceedsD14: 0, eligibleD14: 0, retainedD14: 0, installsD30: 0, proceedsD30: 0, eligibleD30: 0, retainedD30: 0 });

/** Intention-to-treat: ALL purchases after upfront assignment, including immediate buyers.
 * A holdout has no view or recovery purchase context, but must still have outcomes.
 * Never combine this native cohort with the historical Superwall campaign.
 */
export function pokyNativeRecoveryExperiment(attributes: PaywallAttribute[], events: Outcome[], countries: Map<string, string>, start: number, end: number, asOf = Date.now()): MobileAppExperiment {
  const variants: MobileAppExperimentVariant[] = ["holdout", "recovery"].map((key) => ({ ...empty(), key, label: key === "holdout" ? "Regular flow" : "Regular flow + recovery", countries: {} }));
  const languageVariants = Object.fromEntries(["en", "es", "de", "fr"].map((language) => [language,
    ["holdout", "recovery"].map((key) => ({ ...empty(), key, label: key === "holdout" ? "Regular flow" : "Regular flow + recovery", countries: {} })),
  ]));
  const assigned = new Map<string, { arm: number; at: number; country: string; language: string }>();
  for (const [user, record] of firstRecoveryAssignments(parsePaywallAttributes(attributes.filter((a) => POKY_NATIVE_RECOVERY_KEYS.includes(a.key))).assignments, asOf, 2)) {
    assigned.set(user, { arm: record.variant === "holdout" ? 0 : 1, at: record.assignedAt, country: countries.get(user) ?? "unknown", language: record.language });
  }
  // Pick the first assignment BEFORE filtering dates, so changing language cannot re-enrol a user.
  for (const [user, assignment] of assigned) if (assignment.at < start || assignment.at >= end) assigned.delete(user);
  const slices = (a: { arm: number; country: string; language: string }) => {
    const variant = variants[a.arm];
    const localized = languageVariants[a.language]?.[a.arm];
    return [variant, variant.countries[a.country] ??= empty(), ...(localized ? [localized] : [])];
  };
  for (const a of assigned.values()) for (const s of slices(a)) {
    s.users++; s.installs++;
    for (const days of [7, 14, 30] as const) if (a.at + days * DAY <= asOf) s[`installsD${days}`]++;
  }
  const unique = new Map<string, Outcome>();
  for (const e of events) {
    if (!e.transactionId || !["initial_purchase", "renewal", "non_renewing_purchase", "cancellation"].includes(e.name)) continue;
    if (e.name === "cancellation" && (e.netProceeds ?? 0) >= 0) continue;
    const key = `${e.originalTransactionId}|${e.transactionId}|${(e.netProceeds ?? 0) < 0}`;
    if ((unique.get(key)?.attributionTs ?? -Infinity) < e.attributionTs) unique.set(key, e);
  }
  const paid = new Set<string>();
  for (const e of unique.values()) {
    const a = assigned.get(e.appUserId);
    if (!a || e.eventTs < a.at || e.eventTs > asOf || e.netProceeds == null || !Number.isFinite(e.netProceeds)) continue;
    const firstPaid = e.netProceeds > 0 && !paid.has(e.appUserId);
    if (firstPaid) paid.add(e.appUserId);
    for (const s of slices(a)) {
      s.proceeds += e.netProceeds;
      if (firstPaid) s.paid++;
      for (const days of [7, 14, 30] as const) if (a.at + days * DAY <= asOf && e.eventTs < a.at + days * DAY) s[`proceedsD${days}`] += e.netProceeds;
    }
  }
  const enrolled = variants.reduce((total, variant) => total + variant.users, 0);
  const readiness = variants.some((variant) => variant.users < 50) ? "Too few users are enrolled to identify a leading flow. " : "";
  return { id: "poky-native-recovery-holdout", title: "Regular flow vs recovery", subtitle: "Complete onboarding flow · upfront 50/50 assignment", planningNote: `${enrolled} users have an upfront recovery assignment in this date range. ${readiness}APPU is all net proceeds, including regular and recovery purchases, divided by every assigned user, including non-payers. Earlier cancellation-only assignments cannot answer this full-flow comparison.`, variants, languageVariants, scoreMetrics: ["appu"], showUsers: true, showInstalls: false, showDownloadPaid: false, elapsedDays: Math.max(1, (Math.min(asOf, end) - start) / DAY) };
}
