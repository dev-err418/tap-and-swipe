import assert from "node:assert/strict";
import test from "node:test";
import { buildVersyNoteReport, parseVersyNoteAssignment, versyNoteExperiment, VERSY_NOTE_ATTRIBUTE, VERSY_NOTE_EXPERIMENT, VERSY_NOTE_FLOWS, type VersyNoteAssignment } from "../../lib/versy-paywall-note";
import { appExperimentFlow } from "../../lib/app-experiment-flow";

const day = 86_400_000, start = Date.parse("2026-10-26T00:00:00Z"), end = start + 7 * day, asOf = start + 20 * day;
const install = (appUserId: string, installedAt = start, country = "US") => ({ appUserId, installedAt, appVersion: "1.2.9", country });
const record = (extra: Partial<VersyNoteAssignment> = {}): VersyNoteAssignment => ({ schema: 1, experiment: VERSY_NOTE_EXPERIMENT,
  allocation: "20_80", variant: "note", flow: "bible_widget", language: "en", assignedAt: start + 1000, environment: "production", randomized: true, access: "hard", yearlyProduct: "yearly", ...extra });
const attrs = (extra: Partial<VersyNoteAssignment> = {}, environment = "production") => ({ versy_tracking_environment: environment, [VERSY_NOTE_ATTRIBUTE]: JSON.stringify(record({ ...extra, environment } as Partial<VersyNoteAssignment>)) });
type Event = Parameters<typeof buildVersyNoteReport>[1][number];
const event = (appUserId: string, extra: Partial<Event> = {}): Event => ({ appUserId, originalTransactionId: appUserId,
  transactionId: appUserId, name: "initial_purchase", periodType: "normal", netProceeds: 12, isRefund: false,
  eventTs: start + day, attributionTs: start + day, expiresAt: 0, ...extra });

test("reviews are shared before the 80/20 test and both arms keep the existing paywall paths", () => {
  const flow = appExperimentFlow("versy")!;
  assert.deepEqual(flow.edges.filter((e) => e.from === "reviews").map((e) => [e.to, e.label]), [["note-control", "20%"], ["note-note", "80%"]]);
  for (const treatment of ["note-control", "note-note"]) {
    assert.deepEqual(flow.edges.filter((e) => e.from === treatment).map((e) => e.to), ["access-dismissible", "access-hard", "scroll-trial"]);
  }
});

test("strict production records reject missing, corrupt, future and impossible milestones", () => {
  assert.equal(parseVersyNoteAssignment(undefined, asOf), null);
  assert.equal(parseVersyNoteAssignment({ versy_tracking_environment: "production" }, asOf), null);
  assert.equal(parseVersyNoteAssignment(attrs({}, "sandbox"), asOf), null);
  for (const patch of [{ schema: 2 }, { allocation: "50_50" }, { flow: "unknown" }, { assignedAt: asOf + 1 },
    { continuedAt: start + 2000 }, { paywallViewedAt: start + 3000 },
    { viewedAt: start + 3000, continuedAt: start + 2000 }, { variant: "control", viewedAt: start + 2000 },
    { flow: "scroll_the_bible", access: "hard" }]) {
    assert.equal(parseVersyNoteAssignment({ ...attrs(), [VERSY_NOTE_ATTRIBUTE]: JSON.stringify({ ...record(), ...patch }) }, asOf), null);
  }
  assert.deepEqual(parseVersyNoteAssignment({ ...attrs(), [VERSY_NOTE_ATTRIBUTE]: JSON.stringify(JSON.stringify(record())) }, asOf), record());
});

test("all assigned nonpayers, including note dropouts, stay in their frozen flow", () => {
  const attributes = new Map(VERSY_NOTE_FLOWS.flatMap(({ key }) => [
    [key, attrs({ flow: key, access: "dismissible", variant: "control" })], [`${key}_note`, attrs({ flow: key, access: "dismissible", viewedAt: start + 2000 })],
  ] as [string, Record<string, string>][]));
  attributes.set("legacy", { versy_tracking_environment: "production", onboarding_offer_variant: "current" });
  const report = buildVersyNoteReport([...attributes.keys()].map((id) => install(id)), [], attributes, start, end, asOf);
  assert.deepEqual(report.overall.rows.map((r) => r.installs), [3, 3]);
  assert.deepEqual(report.flows.rows.map((r) => r.installs), Array(6).fill(1));
  assert.deepEqual(report.reached.note, { note: 3, continued: 0, paywall: 0 });
  assert.equal(report.overall.rows[1].conversions!.global.proceeds, 0);
});

test("trial starts, paid renewals and refunds follow the assignment without duplicating people or money", () => {
  const attributes = new Map([["trial", attrs()], ["dropout", attrs()], ["control", attrs({ variant: "control" })]]);
  const renewal = event("", { originalTransactionId: "trial", transactionId: "converted", name: "renewal", eventTs: start + 8 * day });
  const report = buildVersyNoteReport([install("trial"), install("dropout"), install("control"), install("trial", start + day)], [
    event("trial", { periodType: "trial", netProceeds: 0, expiresAt: start + 8 * day }), renewal, renewal,
    event("", { originalTransactionId: "trial", transactionId: "converted", name: "cancellation", isRefund: true, netProceeds: -2, eventTs: start + 10 * day }),
    event("control"),
  ], attributes, start, end, asOf);
  const treatment = report.overall.rows[1].conversions!.global;
  assert.equal(treatment.installs, 2);
  assert.equal(treatment.trials, 1);
  assert.equal(treatment.paid, 1);
  assert.equal(treatment.installPaid, 1);
  assert.equal(treatment.proceeds, 10);
  assert.equal(treatment.proceeds / treatment.installs, 5);
  assert.equal(treatment.refunds, 1);
  assert.equal(report.overall.rows[0].conversions!.global.proceeds, 12);
});

test("pre-assignment subscription chains and future money are excluded", () => {
  const report = buildVersyNoteReport([install("old"), install("future")], [
    event("old", { eventTs: start, attributionTs: start }),
    event("", { originalTransactionId: "old", transactionId: "old-renewal", name: "renewal", eventTs: start + day, attributionTs: start }),
    event("future", { eventTs: asOf + 1 }),
  ], new Map([["old", attrs()], ["future", attrs()]]), start, end, asOf);
  assert.equal(report.overall.rows[1].conversions!.global.proceeds, 0);
  assert.equal(report.overall.rows[1].installs, 2);
});

test("route, access and price are frozen independently of later mutable attributes", () => {
  const attributes = new Map([["saved", { ...attrs({ flow: "scroll_the_bible", access: "dismissible" }), onboarding_variant: "bible_widget", onboarding_paywall_access_variant: "hard" }]]);
  const report = buildVersyNoteReport([install("saved")], [], attributes, start, end, asOf);
  assert.equal(report.flows.rows.find((r) => r.version === "scroll_the_bible_note")?.installs, 1);
  assert.equal(report.flows.rows.find((r) => r.version === "bible_widget_note")?.installs, 0);
});

test("A/B results use assignment date, frozen language and country with note dropouts included", () => {
  const attributes = new Map([["new", attrs({ language: "pt", viewedAt: start + 2000, continuedAt: start + 3000, paywallViewedAt: start + 4000 })],
    ["older-install", attrs({ language: "pt" })], ["control", attrs({ variant: "control", language: "en" })]]);
  const installs = [install("new", start, "FR"), install("older-install", start - 2 * day, "FR"), install("control", start, "GB")];
  const report = versyNoteExperiment({ installs, events: [event("new")], attributes, startMs: start, endMs: end }, asOf);
  assert.deepEqual(report.variants.map((r) => r.users), [1, 2]);
  assert.equal(report.variants[1].completed, 1);
  assert.equal(report.variants[1].proceeds, 12);
  assert.equal(report.languageVariants?.pt[1].users, 2);
  assert.equal(report.languageVariants?.en[1].users, 0);
  assert.equal(report.variants[1].countries.FR.users, 2);
  assert.equal(report.variants[1].countries.GB.users, 0);
  const installWindow = buildVersyNoteReport(installs, [], attributes, start, end, asOf);
  assert.equal(installWindow.overall.rows[1].installs, 1);
});


test("incomplete transaction money cannot declare an A/B winner", () => {
  const attributes = new Map([["missing", attrs()]]);
  const report = versyNoteExperiment({ installs: [install("missing")], events: [event("missing", { netProceeds: null })],
    attributes, startMs: start, endMs: end }, asOf);
  assert.match(report.unavailableReason ?? "", /missing/);
  assert.deepEqual(report.variants, []);
  assert.deepEqual(report.languageVariants, {});
});
