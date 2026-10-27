import { emptyVersionConversions, versionCohortConversions } from "./version-cohort-conversions";
import { experimentInstallCohort, EXPERIMENT_MINIMUM_INSTALL_VERSION } from "./app-experiment-cohort";
import type { PaywallCohortComparison } from "./glow-paywall-cohort-comparisons";
import type { MobileAppExperiment, MobileAppExperimentSlice, MobileAppExperimentVariant } from "./mobile-app-analytics";

export const POKY_NOTE_EXPERIMENT = "poky_paywall_note_v1";
export const POKY_NOTE_ATTRIBUTE = "pn1_poky_paywall_note_v1";
export const POKY_NOTE_FLOWS = [
  { key: "current", label: "HP" }, { key: "trial", label: "3 day" },
  { key: "trial_7d", label: "7 day · current" }, { key: "trial_7d_mascot", label: "7 day · mascot" },
] as const;
export type PokyNoteAssignment = {
  schema: 1; experiment: typeof POKY_NOTE_EXPERIMENT; allocation: "20_80";
  variant: "control" | "note"; flow: typeof POKY_NOTE_FLOWS[number]["key"];
  language: "en" | "de" | "es" | "fr"; assignedAt: number; isTemporaryUSOverride: boolean;
  viewedAt?: number; continuedAt?: number; paywallViewedAt?: number;
};
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** No missing-record inference: old users never become controls for the new test. */
export function parsePokyNoteAssignment(values: Record<string, string> | undefined, asOf: number): PokyNoteAssignment | null {
  if (values?.poky_tracking_environment !== "production" || !values[POKY_NOTE_ATTRIBUTE]) return null;
  try {
    let r: unknown = JSON.parse(values[POKY_NOTE_ATTRIBUTE]);
    if (typeof r === "string") r = JSON.parse(r);
    if (!object(r) || r.schema !== 1 || r.experiment !== POKY_NOTE_EXPERIMENT || r.allocation !== "20_80"
      || !["control", "note"].includes(String(r.variant)) || !POKY_NOTE_FLOWS.some((f) => f.key === r.flow)
      || !["en", "de", "es", "fr"].includes(String(r.language)) || typeof r.isTemporaryUSOverride !== "boolean"
      || typeof r.assignedAt !== "number" || !Number.isFinite(r.assignedAt) || r.assignedAt <= 0 || r.assignedAt > asOf
      || (r.isTemporaryUSOverride && r.flow !== "current")) return null;
    for (const key of ["viewedAt", "continuedAt", "paywallViewedAt"]) {
      const t = r[key];
      if (t !== undefined && (typeof t !== "number" || !Number.isFinite(t) || t < r.assignedAt || t > asOf)) return null;
    }
    if (r.variant === "control" && (r.viewedAt !== undefined || r.continuedAt !== undefined)) return null;
    if (r.continuedAt !== undefined && (r.viewedAt === undefined || Number(r.continuedAt) < Number(r.viewedAt))) return null;
    if (r.variant === "note" && r.paywallViewedAt !== undefined
      && (r.continuedAt === undefined || Number(r.paywallViewedAt) < Number(r.continuedAt))) return null;
    return r as PokyNoteAssignment;
  } catch { return null; }
}

type Install = Parameters<typeof versionCohortConversions>[0][number] & { country?: string };
type Events = Parameters<typeof versionCohortConversions>[1];
export type PokyNoteReport = {
  overall: PaywallCohortComparison;
  flows: PaywallCohortComparison;
  reached: Record<string, { note: number; continued: number; paywall: number }>;
};

export function buildPokyNoteReport(installs: Install[], events: Events, attributes: Map<string, Record<string, string>>,
  startMs: number, endMs: number, asOf = Date.now(), dateBasis: "install" | "assignment" = "install", includeFlows = true): PokyNoteReport {
  let invalid = 0;
  const enrolled = experimentInstallCohort(installs, EXPERIMENT_MINIMUM_INSTALL_VERSION.poky, asOf).flatMap((install) => {
    const values = attributes.get(install.appUserId);
    const assignment = parsePokyNoteAssignment(values, asOf);
    if (!assignment) { if (values?.[POKY_NOTE_ATTRIBUTE] && values.poky_tracking_environment === "production") invalid++; return []; }
    const cohortDate = dateBasis === "install" ? install.installedAt : assignment.assignedAt;
    if (cohortDate < startMs || cohortDate >= endMs || cohortDate > asOf) return [];
    return [{ install, assignment, cohortDate }];
  });
  const reached: PokyNoteReport["reached"] = {};
  const compare = (labels: Record<string, string>, group: (r: PokyNoteAssignment) => string): PaywallCohortComparison => {
    const rows = Object.keys(labels).map((key) => {
      const members = enrolled.filter(({ assignment }) => group(assignment) === key);
      const conversions = versionCohortConversions(
        members.map(({ install, cohortDate }) => ({ ...install, installedAt: cohortDate, appVersion: "0" })), events, attributes,
        startMs, endMs, asOf, new Map(members.map(({ install, assignment }) => [install.appUserId, Math.max(install.installedAt, assignment.assignedAt)])),
      ).get("0") ?? emptyVersionConversions();
      reached[key] = { note: members.filter((r) => r.assignment.viewedAt !== undefined).length,
        continued: members.filter((r) => r.assignment.continuedAt !== undefined).length,
        paywall: members.filter((r) => r.assignment.paywallViewedAt !== undefined).length };
      return { version: key, installs: conversions.global.installs, tracked: conversions.global.installs, variants: [], conversions };
    });
    return { status: rows.some((r) => r.installs > 0) ? "ready" : "empty", rows, labels,
      warnings: invalid ? [`${invalid} invalid team-note assignments were excluded.`] : [] };
  };
  return {
    overall: compare({ control: "Original flow · 20%", note: "With team note · 80%" }, (r) => r.variant),
    flows: compare(Object.fromEntries((includeFlows ? POKY_NOTE_FLOWS : []).flatMap(({ key, label }) => [
      [key, label], [`${key}_note`, `${label} + note`],
    ])), (r) => r.flow + (r.variant === "note" ? "_note" : "")),
    reached,
  };
}

type Facts = { installs: Install[]; events: Events; attributes: Map<string, Record<string, string>>; startMs: number; endMs: number };
export function pokyNoteExperiment(facts: Facts, asOf = Date.now()): MobileAppExperiment {
  const report = (installs: Install[], attributes = facts.attributes) => buildPokyNoteReport(installs, facts.events, attributes,
    facts.startMs, facts.endMs, asOf, "assignment", false);
  const slice = (report: PokyNoteReport, key: string): MobileAppExperimentSlice => {
    const metric = report.overall.rows.find((r) => r.version === key)!.conversions!.global;
    return { users: metric.installs, installs: metric.installs, sessions: 0, completed: report.reached[key].paywall,
      trials: metric.trials, converted: metric.paid, paid: metric.installPaid, proceeds: metric.proceeds,
      proceedsVariance: metric.proceedsVariance ?? 0,
      installsD7: 0, proceedsD7: 0, eligibleD7: 0, retainedD7: 0, installsD14: 0, proceedsD14: 0, eligibleD14: 0, retainedD14: 0,
      installsD30: 0, proceedsD30: 0, eligibleD30: 0, retainedD30: 0 };
  };
  const variants = (attributes = facts.attributes): MobileAppExperimentVariant[] => {
    const overall = report(facts.installs, attributes);
    const countries = [...new Set(facts.installs.map((i) => i.country ?? "unknown"))];
    const countryReports = countries.map((country) => [country, report(facts.installs.filter((i) => (i.country ?? "unknown") === country), attributes)] as const);
    return ["control", "note"].map((key) => ({ ...slice(overall, key), key, label: overall.overall.labels[key],
      countries: Object.fromEntries(countryReports.map(([country, comparison]) => [country, slice(comparison, key)])) }));
  };
  const languageVariants = Object.fromEntries(["en", "de", "es", "fr"].map((language) => [language,
    variants(new Map([...facts.attributes].filter(([, attrs]) => parsePokyNoteAssignment(attrs, asOf)?.language === language)))]));
  const incomplete = report(facts.installs).overall.rows.some((r) => {
    const metric = r.conversions!.global;
    return metric.missingMoney || metric.missingProceeds || metric.missingInstallMoney;
  });
  return { unavailableReason: incomplete ? "Some transaction amounts or identities are missing. Results are withheld until the data is complete." : undefined,
    id: POKY_NOTE_EXPERIMENT, title: "Team note before paywalls", subtitle: "80% with note · 20% original flow · independent of the offer",
    planningNote: "Requires the updated app. Includes assigned non-payers and people who leave on the note. Base flow is frozen at enrollment; US override entrants are labeled HP. Later purchases, linked renewals and refunds follow subscriptions started after note assignment. Historical offer assignments are unchanged.",
    variants: incomplete ? [] : variants(), languageVariants: incomplete ? {} : languageVariants, randomized: true, scoreMetrics: ["appu", "download_paid"],
    showUsers: true, showInstalls: false, showTrials: true, showCompletion: true, completionLabel: "Reached paywall",
    paidRateLabel: "Assigned → paid", trialRateLabel: "Assigned → trial" };
}
