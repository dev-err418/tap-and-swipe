import type { ExperimentFlowNode } from "./app-experiment-flow";
import type { MobileAppExperiment } from "./mobile-app-analytics";
import type { NativePaywallReport } from "./native-paywall-analytics";
import { JOURNAL_PRACTICE_ID } from "./journal-practice-analytics";

const RECOVERY_COMPARISON_ID = "poky-native-recovery-holdout";

/** Only the upfront assignment compares complete onboarding flows. */
export function experimentMapRecoveryGroup(report: NativePaywallReport | null, language = "en") {
  if (report?.status !== "ready") return null;
  return report.groups.find((group) => group.experiment === `poky_native_recovery_v2_${language}`
    && group.language === language && group.paywalls.some((row) => row.users > 0)) ?? null;
}

export function experimentMapDetailTarget(node: ExperimentFlowNode, language?: string, report: NativePaywallReport | null = null) {
  if ((node.experimentId ?? node.statsTarget?.experimentId) === RECOVERY_COMPARISON_ID) {
    const audience = language ?? "en";
    const group = experimentMapRecoveryGroup(report, audience);
    return { kind: "paywalls" as const, experimentId: group?.experiment ?? `poky_native_recovery_v2_${audience}`, language: audience };
  }
  const paywallExperiment = node.paywallMetric?.experiment ?? node.statsTarget?.paywallExperiment;
  if (paywallExperiment) {
    const audience = node.paywallMetric?.language ?? node.statsTarget?.language ?? "all";
    return { kind: "paywalls" as const, experimentId: paywallExperiment,
      language: audience === "all" ? language ?? "all" : audience };
  }
  const experimentId = node.cohortMetric?.experiment ?? node.experimentId ?? node.statsTarget?.experimentId;
  if (!experimentId) return null;
  return { kind: experimentId === JOURNAL_PRACTICE_ID ? "journal" as const : "experiment" as const,
    experimentId, language: experimentId === JOURNAL_PRACTICE_ID ? "all" : language ?? "all" };
}

export function experimentMapPaywallGroup(node: ExperimentFlowNode, report: NativePaywallReport | null, language?: string) {
  const target = experimentMapDetailTarget(node, language, report);
  if (target?.kind !== "paywalls" || report?.status !== "ready") return null;
  return report.groups.find((group) => group.experiment === target.experimentId && group.language === target.language) ?? null;
}

/** The same joint cohorts and denominator used on the map card. */
export function experimentMapBranchSummary(node: ExperimentFlowNode, experiment: MobileAppExperiment) {
  const keys = node.cohortMetric?.variants ?? (node.variantId ? [node.variantId] : []);
  if (!keys.length || (node.cohortMetric && experiment.paidUsersOnly)) return null;
  const rows = keys.map((key) => experiment.variants.find((row) => row.key === key));
  if (rows.some((row) => !row)) return null;
  const users = rows.reduce((sum, row) => sum + (node.cohortMetric ? row!.installs : row!.users || row!.installs), 0);
  const proceeds = rows.reduce((sum, row) => sum + row!.proceeds, 0);
  return { users, proceeds, appu: users > 0 ? proceeds / users : null };
}
