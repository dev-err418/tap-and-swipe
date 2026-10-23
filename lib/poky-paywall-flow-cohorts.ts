import { isPokyOfferAssignment, pokyOfferVariants } from "./poky-onboarding-offer";
import { emptyVersionConversions, versionCohortConversions } from "./version-cohort-conversions";
import type { PaywallCohortComparison } from "./glow-paywall-cohort-comparisons";
import { experimentInstallCohort, EXPERIMENT_MINIMUM_INSTALL_VERSION } from "./app-experiment-cohort";

export type PokyPaywallFlowComparison = PaywallCohortComparison;

/** Keep saved offer assignments independent of onboarding route and purchased product. */
export function buildPokyPaywallFlowComparison(
  installs: Parameters<typeof versionCohortConversions>[0],
  events: Parameters<typeof versionCohortConversions>[1],
  attributes: Map<string, Record<string, string>>,
  startMs: number,
  endMs: number,
  asOf = Date.now(),
): PokyPaywallFlowComparison {
  const eligible = experimentInstallCohort(installs, EXPERIMENT_MINIMUM_INSTALL_VERSION.poky, asOf);
  let invalidTimes = 0;
  const enrolled = eligible.flatMap((install) => {
    if (install.installedAt < startMs || install.installedAt >= endMs || install.installedAt > asOf) return [];
    const values = attributes.get(install.appUserId);
    if (!isPokyOfferAssignment(values) || !values) return [];
    const assignedAt = Number(values.onboarding_offer_assigned_at);
    if (!Number.isFinite(assignedAt) || assignedAt <= 0 || assignedAt > asOf) { invalidTimes++; return []; }
    return [{ install, assignedAt, variant: values.onboarding_offer_variant }];
  });
  const labels = Object.fromEntries(pokyOfferVariants().map(({ key, label }) => [key, label]));
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
