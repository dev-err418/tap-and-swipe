import { experimentInstallCohort, EXPERIMENT_MINIMUM_INSTALL_VERSION } from "./app-experiment-cohort";
import { emptyVersionConversions, versionCohortConversions } from "./version-cohort-conversions";
import { isVersyYearlyPriceAssignment } from "./versy-yearly-price-cohorts";
import { versyOnboardingAudience } from "./versy-onboarding-analytics";
import { isMobileMoneyEvent } from "./mobile-app-money";
import type { PaywallCohortComparison } from "./glow-paywall-cohort-comparisons";

type Install = Parameters<typeof versionCohortConversions>[0][number] & { country: string };
type Event = Parameters<typeof versionCohortConversions>[1][number];
type Member = { install: Install; start: number; variant: string };
export type VersyPaywallCheckpoint = {
  hours: 24 | 48; installs: number; trials: number; uncancelledTrials: number;
  paid: number; uncancelledOrPaid: number; missingMoney: boolean; missingTrialExpiry: boolean;
};
export type VersyPaywallComparison = PaywallCohortComparison & {
  asOf: number;
  checkpoints: Record<string, VersyPaywallCheckpoint[]>;
};
const LABELS = { hard: "Hard Widget", dismissible: "Dismissible Widget", bible_scroll: "Bible Scroll" };

/** Seven-day assigned cohorts, including non-payers; Scroll never follows the Widget access draw. */
export function buildVersyPaywallComparison(installs: Install[], events: Event[],
  attributes: Map<string, Record<string, string>>, asOf = Date.now()): VersyPaywallComparison {
  let invalidTimes = 0;
  const members: Member[] = experimentInstallCohort(installs, EXPERIMENT_MINIMUM_INSTALL_VERSION.versy, asOf)
    .flatMap((install) => {
      const values = attributes.get(install.appUserId);
      if (!values || !isVersyYearlyPriceAssignment(values) || values.onboarding_experiment_id !== "scroll_the_bible_v1"
        || versyOnboardingAudience(install.country, values) !== "comparison") return [];
      const widget = ["bible_widget", "bible_widget_shorter"].includes(values.onboarding_variant)
        && values.onboarding_paywall_experiment_id === "versy_yearly_paywalls_v1";
      const variant = values.onboarding_variant === "scroll_the_bible" ? "bible_scroll"
        : widget && ["hard", "dismissible"].includes(values.onboarding_paywall_access_variant)
          ? values.onboarding_paywall_access_variant : null;
      if (!variant) return [];
      const assignedAt = Number(values.yearly_price_assigned_at);
      if (!Number.isFinite(assignedAt) || assignedAt <= 0 || assignedAt > asOf) { invalidTimes++; return []; }
      return [{ install, variant, start: Math.max(install.installedAt, assignedAt) }];
    });
  const observed = events.filter((event) => Number.isFinite(event.eventTs) && event.eventTs <= asOf);
  const chains = new Map<string, Event[]>();
  for (const event of observed) {
    if (!event.originalTransactionId) continue;
    const chain = chains.get(event.originalTransactionId) ?? [];
    chain.push(event); chains.set(event.originalTransactionId, chain);
  }
  const byUser = new Map<string, Event[][]>();
  for (const chain of chains.values()) {
    chain.sort((a, b) => a.eventTs - b.eventTs || b.attributionTs - a.attributionTs);
    const first = chain.find((event) => event.name === "initial_purchase" && !event.isRefund && event.appUserId);
    if (!first) continue;
    const owned = byUser.get(first.appUserId) ?? [];
    owned.push(chain); byUser.set(first.appUserId, owned);
  }
  const checkpoints: VersyPaywallComparison["checkpoints"] = {};
  const rows = Object.keys(LABELS).map((variant) => {
    const selected = members.filter((member) => member.variant === variant);
    const conversions = versionCohortConversions(selected.map(({ install }) => ({ ...install, appVersion: "0" })),
      observed, attributes, 0, asOf + 1, asOf, new Map(selected.map((m) => [m.install.appUserId, m.start]))).get("0")
      ?? emptyVersionConversions();
    checkpoints[variant] = ([24, 48] as const).map((hours) => {
      const eligible = selected.filter((m) => m.start + hours * 3_600_000 <= asOf);
      const result: VersyPaywallCheckpoint = { hours, installs: eligible.length, trials: 0,
        uncancelledTrials: 0, paid: 0, uncancelledOrPaid: 0, missingMoney: false, missingTrialExpiry: false };
      for (const member of eligible) {
        const cutoff = member.start + hours * 3_600_000;
        let trial = false, uncancelled = false, paid = false;
        for (const chain of byUser.get(member.install.appUserId) ?? []) {
          const first = chain.find((event) => event.name === "initial_purchase" && !event.isRefund);
          if (!first || first.eventTs < member.start || first.eventTs > cutoff) continue;
          const throughCheckpoint = chain.filter((event) => event.eventTs >= first.eventTs && event.eventTs <= cutoff);
          if (first.periodType === "trial") {
            trial = true;
            if (!Number.isFinite(first.expiresAt) || first.expiresAt <= first.eventTs) result.missingTrialExpiry = true;
            // Follow recorded expiry, including daylight-saving changes; no inferred seven-day timestamp.
            if (first.expiresAt > cutoff && !throughCheckpoint.some((event) => event.name === "cancellation" || event.isRefund)) uncancelled = true;
          }
          for (const event of throughCheckpoint) {
            if (event.isRefund || event.periodType === "trial" || !isMobileMoneyEvent(event)) continue;
            if (event.netProceeds == null || !Number.isFinite(event.netProceeds)) result.missingMoney = true;
            else if (event.netProceeds > 0) paid = true;
          }
        }
        if (trial) result.trials++;
        if (uncancelled) result.uncancelledTrials++;
        if (paid) result.paid++;
        if (uncancelled || paid) result.uncancelledOrPaid++;
      }
      return result;
    });
    return { version: variant, installs: conversions.global.installs, tracked: conversions.global.installs, variants: [], conversions };
  });
  return { status: rows.some((row) => row.installs > 0) ? "ready" : "empty", asOf, rows, labels: LABELS, checkpoints,
    warnings: invalidTimes ? [`${invalidTimes} assignments with missing or invalid dates were excluded.`] : [] };
}
