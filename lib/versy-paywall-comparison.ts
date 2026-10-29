import { buildVersyNoteReport, buildVersyPaywallFlowHistory, type VersyNoteReport } from "./versy-paywall-note";
import { experimentInstallCohort, EXPERIMENT_MINIMUM_INSTALL_VERSION } from "./app-experiment-cohort";
import { emptyVersionConversions, versionCohortConversions } from "./version-cohort-conversions";
import { parsePaywallAttributes } from "./native-paywall-analytics";
import { isMobileMoneyEvent } from "./mobile-app-money";
import type { PaywallCohortComparison } from "./glow-paywall-cohort-comparisons";

type Install = Parameters<typeof versionCohortConversions>[0][number] & { country: string };
type Event = Parameters<typeof versionCohortConversions>[1][number];
type Member = { install: Install; start: number; variant: string; flow: string };
export type VersyPaywallCheckpoint = {
  hours: 24 | 48; installs: number; trials: number; uncancelledTrials: number;
  paid: number; uncancelledOrPaid: number; missingMoney: boolean; missingTrialExpiry: boolean;
};
export type VersyPaywallComparison = PaywallCohortComparison & {
  asOf: number;
  noteExperiment?: VersyNoteReport;
  checkpoints: Record<string, VersyPaywallCheckpoint[]>;
};
const LABELS = { hard: "Hard Widget", dismissible: "Dismissible Widget", bible_scroll: "Bible Scroll" };
const ONBOARDING_EXPERIMENT = "versy_onboarding_outcomes_v1";
export const VERSY_ONBOARDING_ASSIGNMENT_ATTRIBUTE = `gp1_a_${ONBOARDING_EXPERIMENT}`;

/** All-country onboarding outcomes across trial lengths, including non-payers. */
export function buildVersyPaywallComparison(installs: Install[], events: Event[],
  attributes: Map<string, Record<string, string>>, asOf = Date.now()): VersyPaywallComparison {
  let invalidTimes = 0;
  let invalidEnrollments = 0;
  const { assignments } = parsePaywallAttributes([...attributes].flatMap(([appUserId, values]) =>
    values[VERSY_ONBOARDING_ASSIGNMENT_ATTRIBUTE] === undefined ? []
      : [{ appUserId, key: VERSY_ONBOARDING_ASSIGNMENT_ATTRIBUTE, value: values[VERSY_ONBOARDING_ASSIGNMENT_ATTRIBUTE] }]));
  const members: Member[] = experimentInstallCohort(installs, EXPERIMENT_MINIMUM_INSTALL_VERSION.versy, asOf)
    .flatMap((install) => {
      const values = attributes.get(install.appUserId);
      if (!values || values.versy_tracking_environment !== "production"
        || values.onboarding_experiment_id !== "scroll_the_bible_v1") return [];
      const widget = ["bible_widget", "bible_widget_shorter"].includes(values.onboarding_variant)
        && values.onboarding_paywall_experiment_id === "versy_yearly_paywalls_v1";
      const variant = values.onboarding_variant === "scroll_the_bible" ? "bible_scroll"
        : widget && ["hard", "dismissible"].includes(values.onboarding_paywall_access_variant)
          ? values.onboarding_paywall_access_variant : null;
      if (!variant) return [];
      const enrollment = assignments.get(`${install.appUserId}|${ONBOARDING_EXPERIMENT}`);
      if (values[VERSY_ONBOARDING_ASSIGNMENT_ATTRIBUTE] !== undefined) {
        // Price attributes can change on upgrade. Keep the original Welcome
        // time so earlier trials and direct purchases retain their attribution.
        if (!enrollment || enrollment.variant !== values.onboarding_variant || enrollment.paywall !== enrollment.variant) {
          invalidEnrollments++;
          return [];
        }
      }
      const assignedAt = enrollment?.assignedAt ?? Number(values.yearly_price_assigned_at);
      if (!Number.isFinite(assignedAt) || assignedAt <= 0 || assignedAt > asOf) { invalidTimes++; return []; }
      return [{ install, variant, flow: values.onboarding_variant, start: Math.max(install.installedAt, assignedAt) }];
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
            // Follow each trial's recorded expiry, including its length and daylight-saving changes.
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
  const noteExperiment = buildVersyNoteReport(installs, events, attributes, 0, asOf + 1, asOf, "install", false);
  noteExperiment.flows = buildVersyPaywallFlowHistory(members, installs, events, attributes, asOf);
  return { noteExperiment,
    status: rows.some((row) => row.installs > 0) ? "ready" : "empty", asOf, rows, labels: LABELS, checkpoints,
    warnings: [
      ...(invalidTimes ? [`${invalidTimes} assignments with missing or invalid dates were excluded.`] : []),
      ...(invalidEnrollments ? [`${invalidEnrollments} invalid original onboarding records were excluded.`] : []),
    ] };
}
