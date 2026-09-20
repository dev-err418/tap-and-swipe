import type { MobileAppExperiment, MobileAppExperimentSlice, MobileAppExperimentVariant } from "./mobile-app-analytics";
import { parsePaywallAttributes, type PaywallAttribute } from "./native-paywall-analytics";

export const POKY_NATIVE_RECOVERY_KEYS = ["en", "de", "es", "fr"].map((language) => `gp1_a_poky_native_recovery_v1_${language}`);
type Outcome = { appUserId: string; eventTs: number; name: string; netProceeds: number | null; originalTransactionId: string; transactionId: string; attributionTs: number };
const DAY = 86_400_000;
const empty = (): MobileAppExperimentSlice => ({ users: 0, sessions: 0, installs: 0, completed: 0, trials: 0, converted: 0, paid: 0, proceeds: 0, installsD7: 0, proceedsD7: 0, eligibleD7: 0, retainedD7: 0, installsD14: 0, proceedsD14: 0, eligibleD14: 0, retainedD14: 0, installsD30: 0, proceedsD30: 0, eligibleD30: 0, retainedD30: 0 });

/** Intention-to-treat: ALL purchases after eligibility, not just recovery-SKU purchases.
 * A holdout has no view or recovery purchase context, but must still have outcomes.
 * Never combine this native cohort with the historical Superwall campaign.
 */
export function pokyNativeRecoveryExperiment(attributes: PaywallAttribute[], events: Outcome[], countries: Map<string, string>, start: number, end: number, asOf = Date.now()): MobileAppExperiment {
  const variants: MobileAppExperimentVariant[] = ["holdout", "recovery"].map((key) => ({ ...empty(), key, label: key === "holdout" ? "No recovery" : "Recovery", countries: {} }));
  const assigned = new Map<string, { arm: number; at: number; country: string }>();
  for (const [key, record] of parsePaywallAttributes(attributes.filter((a) => POKY_NATIVE_RECOVERY_KEYS.includes(a.key))).assignments) {
    if (!POKY_NATIVE_RECOVERY_KEYS.includes(`gp1_a_${record.experiment}`) || !["holdout", "recovery"].includes(record.variant) || record.assignedAt > asOf) continue;
    const user = key.slice(0, key.lastIndexOf("|"));
    if ((assigned.get(user)?.at ?? Infinity) <= record.assignedAt) continue;
    assigned.set(user, { arm: record.variant === "holdout" ? 0 : 1, at: record.assignedAt, country: countries.get(user) ?? "unknown" });
  }
  // Pick the first eligibility BEFORE filtering dates, so changing language cannot re-enrol a user.
  for (const [user, assignment] of assigned) if (assignment.at < start || assignment.at >= end) assigned.delete(user);
  const slices = (a: { arm: number; country: string }) => {
    const variant = variants[a.arm];
    return [variant, variant.countries[a.country] ??= empty()];
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
  return { id: "poky-native-recovery-holdout", title: "Recovery A/B test", subtitle: "Hardcoded paywalls · Recovery / No recovery 50/50 · all proceeds after first eligibility", variants, scoreMetrics: ["appu_d7", "appu_d14", "appu_d30"], showUsers: true, showInstalls: false, showDownloadPaid: false };
}
