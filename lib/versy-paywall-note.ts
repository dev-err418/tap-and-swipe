import { emptyVersionConversions, versionCohortConversions } from "./version-cohort-conversions";
import { experimentInstallCohort, EXPERIMENT_MINIMUM_INSTALL_VERSION } from "./app-experiment-cohort";
import type { PaywallCohortComparison } from "./glow-paywall-cohort-comparisons";
import type { MobileAppExperiment, MobileAppExperimentSlice, MobileAppExperimentVariant } from "./mobile-app-analytics";
import { parseScalarAssignment, VERSY_ANDROID_NOTE_ATTRIBUTE, VERSY_ANDROID_NOTE_EXPERIMENT } from "./versy-android-experiments";
import { VERSY_ANDROID_INSTALL_VERSION, type VersyAnalyticsPlatform } from "./versy-analytics-platform";

export const VERSY_NOTE_EXPERIMENT = "versy_paywall_note_v1";
export const VERSY_NOTE_ATTRIBUTE = "vn1_versy_paywall_note_v1";
const VERSY_NOTE_LANGUAGES = ["en", "de", "es", "pt", "fr"] as const;
export const VERSY_NOTE_FLOWS = [
  { key: "bible_widget", label: "Bible Widget" },
  { key: "bible_widget_shorter", label: "Bible Short" },
  { key: "scroll_the_bible", label: "Bible Scroll · Current" },
  { key: "scroll_the_bible_animations", label: "Bible Scroll · Animations" },
  { key: "scroll_the_bible_videos", label: "Bible Scroll · Videos" },
] as const;
export type VersyNoteAssignment = {
  schema: 1; experiment: typeof VERSY_NOTE_EXPERIMENT | typeof VERSY_ANDROID_NOTE_EXPERIMENT; allocation: "20_80" | "50_50";
  variant: "control" | "note"; flow: typeof VERSY_NOTE_FLOWS[number]["key"];
  language: typeof VERSY_NOTE_LANGUAGES[number]; assignedAt: number;
  environment: "production"; randomized: true; access: "hard" | "dismissible"; yearlyProduct: string;
  viewedAt?: number; continuedAt?: number; paywallViewedAt?: number; noteRevision?: string;
};
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** No missing-record inference: old users never become controls for the new test. */
export function parseVersyNoteAssignment(values: Record<string, string> | undefined, asOf: number, platform: VersyAnalyticsPlatform = "ios"): VersyNoteAssignment | null {
  const attribute = platform === "android" ? VERSY_ANDROID_NOTE_ATTRIBUTE : VERSY_NOTE_ATTRIBUTE;
  if (!values?.[attribute]) return null;
  try {
    let r: unknown = parseScalarAssignment(values[attribute]);
    if (platform === "android") {
      const routes: Record<string, string> = { widget: "bible_widget", "widget-shorter": "bible_widget_shorter", scroll: "scroll_the_bible" };
      if (!object(r) || r.experiment !== VERSY_ANDROID_NOTE_EXPERIMENT || r.allocation !== "50_50" || r.access !== "dismissible") return null;
      r = { ...r, flow: routes[String(r.flow)] };
    }
    if (!object(r) || r.schema !== 1 || r.experiment !== (platform === "android" ? VERSY_ANDROID_NOTE_EXPERIMENT : VERSY_NOTE_EXPERIMENT) || !["20_80", "50_50"].includes(String(r.allocation))
      || !["control", "note"].includes(String(r.variant)) || !VERSY_NOTE_FLOWS.some((f) => f.key === r.flow)
      || !VERSY_NOTE_LANGUAGES.some((language) => language === r.language) || r.environment !== "production" || r.randomized !== true
      || !["hard", "dismissible"].includes(String(r.access)) || (platform === "ios" && (typeof r.yearlyProduct !== "string" || !r.yearlyProduct))
      || typeof r.assignedAt !== "number" || !Number.isFinite(r.assignedAt) || r.assignedAt <= 0 || r.assignedAt > asOf) return null;
    for (const key of ["viewedAt", "continuedAt", "paywallViewedAt"]) {
      const t = r[key];
      if (t !== undefined && (typeof t !== "number" || !Number.isFinite(t) || t < r.assignedAt || t > asOf)) return null;
    }
    if (r.variant === "control" && (r.viewedAt !== undefined || r.continuedAt !== undefined)) return null;
    if (r.continuedAt !== undefined && (r.viewedAt === undefined || Number(r.continuedAt) < Number(r.viewedAt))) return null;
    if (r.variant === "note" && r.paywallViewedAt !== undefined
      && (r.continuedAt === undefined || Number(r.paywallViewedAt) < Number(r.continuedAt))) return null;
    return { ...r, yearlyProduct: typeof r.yearlyProduct === "string" ? r.yearlyProduct : "" } as VersyNoteAssignment;
  } catch { return null; }
}

type Install = Parameters<typeof versionCohortConversions>[0][number] & { country?: string };
type Events = Parameters<typeof versionCohortConversions>[1];
export type VersyNoteReport = {
  overall: PaywallCohortComparison;
  flows: PaywallCohortComparison;
  imageVersions: PaywallCohortComparison;
  reached: Record<string, { note: number; continued: number; paywall: number }>;
};

/** Before/after image comparison among actual note viewers; never relabel on app upgrade. */
export function buildVersyNoteImageComparison(installs: Install[], events: Events,
  attributes: Map<string, Record<string, string>>, startMs: number, endMs: number, asOf: number, platform: VersyAnalyticsPlatform = "ios"): PaywallCohortComparison {
  let unknownRevision = 0;
  const members = experimentInstallCohort(installs, platform === "android" ? VERSY_ANDROID_INSTALL_VERSION : EXPERIMENT_MINIMUM_INSTALL_VERSION.versy, asOf).flatMap((install) => {
    const assignment = parseVersyNoteAssignment(attributes.get(install.appUserId), asOf, platform);
    if (!assignment || assignment.variant !== "note" || assignment.viewedAt === undefined
      || assignment.viewedAt < startMs || assignment.viewedAt >= endMs) return [];
    const key = assignment.noteRevision === undefined ? "old_note"
      : assignment.noteRevision === "founder_photo_v2" ? "new_note" : null;
    if (!key) { unknownRevision++; return []; }
    return [{ install, key, viewedAt: assignment.viewedAt }];
  });
  const labels = { old_note: "Old note", new_note: "New note" };
  const rows = Object.keys(labels).map((key) => {
    const selected = members.filter((member) => member.key === key);
    const conversions = versionCohortConversions(selected.map(({ install }) => ({ ...install, appVersion: "0" })),
      events, attributes, 0, asOf + 1, asOf,
      new Map(selected.map(({ install, viewedAt }) => [install.appUserId, viewedAt])),
    ).get("0") ?? emptyVersionConversions();
    return { version: key, installs: conversions.global.installs, tracked: conversions.global.installs, variants: [], conversions };
  });
  return { status: rows.some((r) => r.installs > 0) ? "ready" : "empty", rows, labels,
    warnings: unknownRevision ? [`${unknownRevision} note views with an unknown image revision were excluded.`] : [] };
}

/** Descriptive flow totals pool history with current controls, without inventing A/B enrollment. */
export function buildVersyPaywallFlowHistory(
  members: { install: Install; start: number; flow: string }[], installs: Install[], events: Events,
  attributes: Map<string, Record<string, string>>, asOf: number,
): PaywallCohortComparison {
  let invalid = 0;
  const selected = new Map<string, { install: Install; key: string; outcomeStart: number }>();
  for (const member of members) {
    const values = attributes.get(member.install.appUserId);
    if (values?.[VERSY_NOTE_ATTRIBUTE] !== undefined) continue;
    if (!VERSY_NOTE_FLOWS.some((candidate) => candidate.key === member.flow)) continue;
    selected.set(member.install.appUserId, { install: member.install, key: member.flow, outcomeStart: member.start });
  }
  for (const install of experimentInstallCohort(installs, EXPERIMENT_MINIMUM_INSTALL_VERSION.versy, asOf)) {
    const values = attributes.get(install.appUserId);
    const assignment = parseVersyNoteAssignment(values, asOf);
    // An invalid saved record is not evidence that the user skipped the note.
    if (!assignment) { if (values?.[VERSY_NOTE_ATTRIBUTE] !== undefined) invalid++; continue; }
    // Keep every existing note participant, even when a mutable onboarding ID
    // no longer matches the historical flow report. The saved note route wins.
    selected.set(install.appUserId, { install, key: assignment.flow + (assignment.variant === "note" ? "_note" : ""),
      outcomeStart: Math.max(install.installedAt, assignment.assignedAt) });
  }
  const labels = Object.fromEntries(VERSY_NOTE_FLOWS.flatMap(({ key, label }) => [
    [key, label], [`${key}_note`, `${label} + note`],
  ]));
  const rows = Object.keys(labels).map((key) => {
    const cohort = [...selected.values()].filter((member) => member.key === key);
    const conversions = versionCohortConversions(cohort.map(({ install }) => ({ ...install, appVersion: "0" })),
      events, attributes, 0, asOf + 1, asOf,
      new Map(cohort.map(({ install, outcomeStart }) => [install.appUserId, outcomeStart])),
    ).get("0") ?? emptyVersionConversions();
    return { version: key, installs: conversions.global.installs, tracked: conversions.global.installs, variants: [], conversions };
  });
  return { status: rows.some((row) => row.installs > 0) ? "ready" : "empty", rows, labels,
    warnings: invalid ? [`${invalid} invalid team-note assignments were excluded from flow totals.`] : [] };
}

export function buildVersyNoteReport(installs: Install[], events: Events, attributes: Map<string, Record<string, string>>,
  startMs: number, endMs: number, asOf = Date.now(), dateBasis: "install" | "assignment" = "install", includeFlows = true,
  platform: VersyAnalyticsPlatform = "ios"): VersyNoteReport {
  let invalid = 0;
  const first = new Map<string, Install>();
  for (const install of installs) {
    const previous = first.get(install.appUserId);
    if (install.appUserId && Number.isFinite(install.installedAt) && (!previous || install.installedAt < previous.installedAt)) first.set(install.appUserId, install);
  }
  const enrolled = experimentInstallCohort([...first.values()], platform === "android" ? VERSY_ANDROID_INSTALL_VERSION : EXPERIMENT_MINIMUM_INSTALL_VERSION.versy, asOf).flatMap((install) => {
    const values = attributes.get(install.appUserId);
    const assignment = parseVersyNoteAssignment(values, asOf, platform);
    if (!assignment) { if (values?.[platform === "android" ? VERSY_ANDROID_NOTE_ATTRIBUTE : VERSY_NOTE_ATTRIBUTE] && values.versy_tracking_environment !== "development") invalid++; return []; }
    // Keep the earlier allocation in descriptive history, not the current randomized comparison.
    if (assignment.allocation !== "50_50") return [];
    const cohortDate = dateBasis === "install" ? install.installedAt : assignment.assignedAt;
    if (cohortDate < startMs || cohortDate >= endMs || cohortDate > asOf) return [];
    return [{ install, assignment, cohortDate }];
  });
  const reached: VersyNoteReport["reached"] = {};
  const compare = (labels: Record<string, string>, group: (r: VersyNoteAssignment) => string): PaywallCohortComparison => {
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
    imageVersions: buildVersyNoteImageComparison(installs, events, attributes, startMs, endMs, asOf, platform),
    overall: compare({ control: "Reviews → paywall · 50%", note: "Reviews → note → paywall · 50%" }, (r) => r.variant),
    flows: compare(Object.fromEntries((includeFlows ? platform === "android" ? VERSY_NOTE_FLOWS.slice(0, 3) : VERSY_NOTE_FLOWS : []).flatMap(({ key, label }) => [
      [key, label], [`${key}_note`, `${label} + note`],
    ])), (r) => r.flow + (r.variant === "note" ? "_note" : "")),
    reached,
  };
}

type Facts = { installs: Install[]; events: Events; attributes: Map<string, Record<string, string>>; startMs: number; endMs: number };
export function versyNoteExperiment(facts: Facts, asOf = Date.now(), platform: VersyAnalyticsPlatform = "ios"): MobileAppExperiment {
  const report = (installs: Install[], attributes = facts.attributes) => buildVersyNoteReport(installs, facts.events, attributes,
    facts.startMs, facts.endMs, asOf, "assignment", false, platform);
  const slice = (report: VersyNoteReport, key: string): MobileAppExperimentSlice => {
    const metric = report.overall.rows.find((r) => r.version === key)!.conversions!.global;
    return { users: metric.installs, installs: metric.installs, sessions: 0, completed: report.reached[key].paywall,
      trials: metric.trials, converted: metric.paid, paid: metric.installPaid, proceeds: metric.proceeds,
      proceedsVariance: metric.proceedsVariance ?? 0, offerBreakdown: metric.offerBreakdown, realizedAppu: metric.realizedAppu,
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
  const languageVariants = Object.fromEntries(VERSY_NOTE_LANGUAGES.map((language) => [language,
    variants(new Map([...facts.attributes].filter(([, attrs]) => parseVersyNoteAssignment(attrs, asOf, platform)?.language === language)))]));
  const checked = report(facts.installs);
  const incomplete = checked.overall.rows.some((r) => {
    const m = r.conversions!.global;
    return m.missingMoney || m.missingProceeds || m.missingInstallMoney;
  });
  return { unavailableReason: incomplete ? "Some transaction amounts or identities are missing. Results are withheld until the data is complete." : undefined,
    id: platform === "android" ? VERSY_ANDROID_NOTE_EXPERIMENT : VERSY_NOTE_EXPERIMENT, title: "Team note before paywalls", subtitle: "50% with note · 50% without · reviews in both variants",
    planningNote: platform === "android" ? "Includes Android users assigned at the reviews or trial introduction, including exits before the paywall."
      : "Next app build. Both variants show reviews; 50% of new assignments then see the team note, across every onboarding route. Existing 20/80 assignments stay unchanged and remain in historical flow totals, outside this 50/50 comparison. No rating prompts during onboarding. Includes everyone reaching reviews, including non-payers and dropouts. The saved note assignment is independent of Widget/Scroll, hard/dismissible access and yearly price. Later purchases, linked renewals and refunds follow subscriptions started after enrollment.",
    variants: incomplete ? [] : variants(), languageVariants: incomplete ? {} : languageVariants, randomized: true, scoreMetrics: ["appu", "download_paid"],
    showUsers: true, showInstalls: false, showTrials: true, showCompletion: true, completionLabel: "Reached paywall",
    paidRateLabel: "Assigned → paid", trialRateLabel: "Assigned → trial" };
}
