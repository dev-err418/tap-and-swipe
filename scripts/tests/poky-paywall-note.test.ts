import assert from "node:assert/strict";
import test from "node:test";
import { buildPokyNoteReport, parsePokyNoteAssignment, pokyNoteExperiment, POKY_NOTE_ATTRIBUTE, POKY_NOTE_EXPERIMENT, POKY_NOTE_FLOWS, type PokyNoteAssignment } from "../../lib/poky-paywall-note";
import { appExperimentFlow } from "../../lib/app-experiment-flow";
import { POKY_TRIAL_OFFER_ATTRIBUTE_KEYS } from "../../lib/poky-trial-offer";

const day = 86_400_000, start = Date.parse("2026-10-26T00:00:00Z"), end = start + 7 * day, asOf = start + 20 * day;
const install = (appUserId: string, installedAt = start, country = "US") => ({ appUserId, installedAt, appVersion: "1.1.12", country });
const record = (extra: Partial<PokyNoteAssignment> = {}): PokyNoteAssignment => ({ schema: 1, experiment: POKY_NOTE_EXPERIMENT,
  allocation: "20_80", variant: "note", flow: "trial", language: "en", assignedAt: start + 1000, isTemporaryUSOverride: false, ...extra });
const attrs = (extra: Partial<PokyNoteAssignment> = {}, environment = "production") => ({ poky_tracking_environment: environment, [POKY_NOTE_ATTRIBUTE]: JSON.stringify(record(extra)) });
type Event = Parameters<typeof buildPokyNoteReport>[1][number];
const event = (appUserId: string, extra: Partial<Event> = {}): Event => ({ appUserId, originalTransactionId: appUserId,
  transactionId: appUserId, name: "initial_purchase", periodType: "normal", netProceeds: 12, isRefund: false,
  eventTs: start + day, attributionTs: start + day, expiresAt: 0, ...extra });

test("the new 80/20 split feeds all four existing offers and its attribute is fetched", () => {
  const flow = appExperimentFlow("poky")!;
  assert.deepEqual(flow.edges.filter((e) => e.from === "language").map((e) => [e.to, e.label]), [["note-control", "20%"], ["note-note", "80%"]]);
  for (const treatment of ["note-control", "note-note"]) {
    assert.deepEqual(flow.edges.filter((e) => e.from === treatment).map((e) => [e.to, e.label]), POKY_NOTE_FLOWS.map((f) => [`offer-${f.key}`, f.key === "current" ? "50%" : "16⅔%"]));
  }
  assert.ok(POKY_TRIAL_OFFER_ATTRIBUTE_KEYS.includes(POKY_NOTE_ATTRIBUTE));
});

test("strict production records reject missing, corrupt, future and impossible milestones", () => {
  assert.equal(parsePokyNoteAssignment(undefined, asOf), null);
  assert.equal(parsePokyNoteAssignment({ poky_tracking_environment: "production" }, asOf), null);
  assert.equal(parsePokyNoteAssignment(attrs({}, "sandbox"), asOf), null);
  for (const patch of [{ schema: 2 }, { allocation: "50_50" }, { flow: "unknown" }, { assignedAt: asOf + 1 },
    { continuedAt: start + 2000 }, { paywallViewedAt: start + 3000 },
    { viewedAt: start + 3000, continuedAt: start + 2000 }, { variant: "control", viewedAt: start + 2000 },
    { flow: "trial", isTemporaryUSOverride: true }]) {
    assert.equal(parsePokyNoteAssignment({ ...attrs(), [POKY_NOTE_ATTRIBUTE]: JSON.stringify({ ...record(), ...patch }) }, asOf), null);
  }
  assert.deepEqual(parsePokyNoteAssignment({ ...attrs(), [POKY_NOTE_ATTRIBUTE]: JSON.stringify(JSON.stringify(record())) }, asOf), record());
});

test("all assigned nonpayers, including note dropouts, stay in their frozen flow", () => {
  const attributes = new Map(POKY_NOTE_FLOWS.flatMap(({ key }) => [
    [key, attrs({ flow: key, variant: "control" })], [`${key}_note`, attrs({ flow: key, viewedAt: start + 2000 })],
  ] as [string, Record<string, string>][]));
  attributes.set("legacy", { poky_tracking_environment: "production", onboarding_offer_variant: "current" });
  const report = buildPokyNoteReport([...attributes.keys()].map((id) => install(id)), [], attributes, start, end, asOf);
  assert.deepEqual(report.overall.rows.map((r) => r.installs), [4, 4]);
  assert.deepEqual(report.flows.rows.map((r) => r.installs), Array(8).fill(1));
  assert.deepEqual(report.reached.note, { note: 4, continued: 0, paywall: 0 });
  assert.equal(report.overall.rows[1].conversions!.global.proceeds, 0);
});

test("trial starts, paid renewals and refunds follow the assignment without duplicating people or money", () => {
  const attributes = new Map([["trial", attrs()], ["dropout", attrs()], ["control", attrs({ variant: "control" })]]);
  const renewal = event("", { originalTransactionId: "trial", transactionId: "converted", name: "renewal", eventTs: start + 8 * day });
  const report = buildPokyNoteReport([install("trial"), install("dropout"), install("control"), install("trial", start + day)], [
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
  const report = buildPokyNoteReport([install("old"), install("future")], [
    event("old", { eventTs: start, attributionTs: start }),
    event("", { originalTransactionId: "old", transactionId: "old-renewal", name: "renewal", eventTs: start + day, attributionTs: start }),
    event("future", { eventTs: asOf + 1 }),
  ], new Map([["old", attrs()], ["future", attrs()]]), start, end, asOf);
  assert.equal(report.overall.rows[1].conversions!.global.proceeds, 0);
  assert.equal(report.overall.rows[1].installs, 2);
});

test("US override remains randomized for the note and is reported under HP", () => {
  const attributes = new Map([["us", { ...attrs({ flow: "current", isTemporaryUSOverride: true }), poky_us_hp_override_seen: "true", onboarding_offer_variant: "trial_7d" }]]);
  const report = buildPokyNoteReport([install("us")], [], attributes, start, end, asOf);
  assert.equal(report.flows.rows.find((r) => r.version === "current_note")?.installs, 1);
  assert.equal(report.flows.rows.find((r) => r.version === "trial_7d_note")?.installs, 0);
});

test("A/B results use assignment date, frozen language and country with note dropouts included", () => {
  const attributes = new Map([["new", attrs({ language: "fr", viewedAt: start + 2000, continuedAt: start + 3000, paywallViewedAt: start + 4000 })],
    ["older-install", attrs({ language: "fr" })], ["control", attrs({ variant: "control", language: "en" })]]);
  const installs = [install("new", start, "FR"), install("older-install", start - 2 * day, "FR"), install("control", start, "GB")];
  const report = pokyNoteExperiment({ installs, events: [event("new")], attributes, startMs: start, endMs: end }, asOf);
  assert.deepEqual(report.variants.map((r) => r.users), [1, 2]);
  assert.equal(report.variants[1].completed, 1);
  assert.equal(report.variants[1].proceeds, 12);
  assert.equal(report.languageVariants?.fr[1].users, 2);
  assert.equal(report.languageVariants?.en[1].users, 0);
  assert.equal(report.variants[1].countries.FR.users, 2);
  assert.equal(report.variants[1].countries.GB.users, 0);
  const installWindow = buildPokyNoteReport(installs, [], attributes, start, end, asOf);
  assert.equal(installWindow.overall.rows[1].installs, 1);
});


test("incomplete transaction money cannot declare an A/B winner", () => {
  const attributes = new Map([["missing", attrs()]]);
  const report = pokyNoteExperiment({ installs: [install("missing")], events: [event("missing", { netProceeds: null })],
    attributes, startMs: start, endMs: end }, asOf);
  assert.match(report.unavailableReason ?? "", /missing/);
  assert.deepEqual(report.variants, []);
  assert.deepEqual(report.languageVariants, {});
});
