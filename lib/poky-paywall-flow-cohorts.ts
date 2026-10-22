import { POKY_ONBOARDING_OFFER_EXPERIMENT } from "./poky-trial-offer";
import { emptyVersionConversions, versionCohortConversions } from "./version-cohort-conversions";
import type { PaywallCohortComparison } from "./glow-paywall-cohort-comparisons";

/** Keep saved offer assignments independent of onboarding route and purchased product. */
export function buildPokyPaywallFlowComparison(
  installs: Parameters<typeof versionCohortConversions>[0],
  events: Parameters<typeof versionCohortConversions>[1],
  attributes: Map<string, Record<string, string>>,
  startMs: number,
  endMs: number,
  asOf = Date.now(),
): PaywallCohortComparison {
  const first = new Map<string, (typeof installs)[number]>();
  for (const install of installs) {
    const previous = first.get(install.appUserId);
    if (install.appUserId && Number.isFinite(install.installedAt) && (!previous || install.installedAt < previous.installedAt)) {
      first.set(install.appUserId, install);
    }
  }
  let invalidTimes = 0;
  const enrolled = [...first.values()].flatMap((install) => {
    if (install.installedAt < startMs || install.installedAt >= endMs || install.installedAt > asOf) return [];
    const values = attributes.get(install.appUserId);
    if (values?.poky_tracking_environment !== "production" || values.onboarding_offer_experiment !== POKY_ONBOARDING_OFFER_EXPERIMENT
      || values.onboarding_offer_allocation !== "50_50" || !["current", "trial"].includes(values.onboarding_offer_variant)) return [];
    const assignedAt = Number(values.onboarding_offer_assigned_at);
    if (!Number.isFinite(assignedAt) || assignedAt <= 0 || assignedAt > asOf) { invalidTimes++; return []; }
    return [{ install, assignedAt, variant: values.onboarding_offer_variant }];
  });
  const labels = { current: "HP (hard paywall)", trial: "3-day trial" };
  const rows = Object.keys(labels).map((variant) => {
    const members = enrolled.filter((row) => row.variant === variant);
    const conversions = versionCohortConversions(members.map(({ install }) => ({ ...install, appVersion: "0" })), events,
      attributes, startMs, endMs, asOf, new Map(members.map(({ install, assignedAt }) => [install.appUserId, assignedAt]))).get("0")
      ?? emptyVersionConversions();
    return { version: variant, installs: conversions.global.installs, tracked: conversions.global.installs, variants: [], conversions };
  });
  return { status: rows.some((row) => row.installs > 0) ? "ready" : "empty", rows, labels,
    warnings: invalidTimes ? [`${invalidTimes} paywall assignments have an invalid or missing assignment time and were excluded.`] : [] };
}
