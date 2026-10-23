import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppOverviewPanel from "../../components/analytics/AppOverviewPanel";
import PokyPaywallFlowTable from "../../components/analytics/PokyPaywallFlowTable";
import { buildPokyPaywallFlowComparison } from "../../lib/poky-paywall-flow-cohorts";
import { POKY_ONBOARDING_OFFER_EXPERIMENT } from "../../lib/poky-trial-offer";
import { isPokyOfferAssignment } from "../../lib/poky-onboarding-offer";
import { buildUserJourney, userJourneyDefinition } from "../../lib/user-journey";
import { withJourneyConversions } from "../../lib/journey-cohort-conversions";

const day = 86_400_000, start = Date.parse("2026-10-01T00:00:00Z"), end = start + 7 * day, asOf = start + 20 * day;
const install = (appUserId: string, installedAt = start) => ({ appUserId, installedAt, appVersion: "1.1.5" });
const assignment = (variant = "current", extra = {}) => ({ poky_tracking_environment: "production",
  onboarding_offer_experiment: POKY_ONBOARDING_OFFER_EXPERIMENT, onboarding_offer_allocation: "25_25_25_25",
  onboarding_offer_variant: variant, onboarding_offer_assigned_at: String(start + 1000), ...extra });
type Event = Parameters<typeof buildPokyPaywallFlowComparison>[1][number];
const event = (appUserId: string, extra: Partial<Event> = {}): Event => ({ appUserId, originalTransactionId: appUserId,
  transactionId: appUserId, name: "initial_purchase", periodType: "normal", netProceeds: 12, isRefund: false,
  eventTs: start + day, attributionTs: start + day, expiresAt: 0, ...extra });

test("paywall flows retain nonpayers and follow saved assignments through renewals and refunds", () => {
  const renewal = event("", { originalTransactionId: "trial", transactionId: "paid", name: "renewal", eventTs: start + 5 * day });
  const report = buildPokyPaywallFlowComparison([install("hp"), install("trial"), install("free")], [event("hp"),
    event("trial", { periodType: "trial", netProceeds: 0, expiresAt: start + 4 * day }), renewal, renewal,
    event("", { originalTransactionId: "trial", name: "cancellation", transactionId: "paid", isRefund: true, netProceeds: -2, eventTs: start + 10 * day }),
  ], new Map([["hp", assignment()], ["trial", assignment("trial")], ["free", assignment("trial")]]), start, end, asOf);
  assert.deepEqual(report.rows.map((row) => row.installs), [1, 2, 0, 0]);
  const metric = report.rows[1].conversions!.global;
  assert.equal(metric.proceeds / metric.installs, 5);
  assert.equal(metric.trials, 1);
  assert.equal(metric.finishedTrials, 1);
  assert.equal(metric.paid, 1);
  assert.equal(metric.purchases, 1);
  assert.equal(metric.refunds, 1);
});

test("legacy, debug, unknown, future and out-of-window assignments cannot enter", () => {
  const attributes = new Map([
    ["legacy", assignment("current", { onboarding_offer_allocation: "legacy" })],
    ["debug", assignment("trial", { poky_tracking_environment: "development" })],
    ["unknown", assignment("other")], ["future", assignment("trial", { onboarding_offer_assigned_at: String(asOf + day) })],
    ["missing-time", assignment("trial", { onboarding_offer_assigned_at: "" })], ["outside", assignment()],
  ]);
  const report = buildPokyPaywallFlowComparison([...attributes.keys()].map((id) => install(id, id === "outside" ? start - day : start)),
    [], attributes, start, end, asOf);
  assert.equal(report.status, "empty");
  assert.deepEqual(report.rows.map((row) => row.installs), [0, 0, 0, 0]);
  assert.equal(report.warnings.length, 1);
});

test("subscription chains started before assignment stay excluded", () => {
  const report = buildPokyPaywallFlowComparison([install("user")], [event("user"),
    event("user", { name: "renewal", transactionId: "old-renewal", eventTs: start + 3 * day }),
    event("user", { originalTransactionId: "new", transactionId: "new", eventTs: start + 4 * day, netProceeds: 5 }),
  ], new Map([["user", assignment("current", { onboarding_offer_assigned_at: String(start + 2 * day) })]]), start, end, asOf);
  assert.equal(report.rows[0].conversions!.global.proceeds, 5);
});

test("the all-time paywall cohort includes v1.1.5 through current releases and does not reenroll older upgrades", () => {
  const installs = [install("floor"), { ...install("newer"), appVersion: "1.1.6" },
    { ...install("previously-excluded"), appVersion: "1.1.9" }, { ...install("current"), appVersion: "1.1.10" },
    { ...install("upgraded", start - day), appVersion: "1.1.4" }, install("upgraded"),
    { ...install("unknown"), appVersion: "" }, install("future", asOf + day)];
  const attributes = new Map(installs.map((row) => [row.appUserId, assignment()]));
  const report = buildPokyPaywallFlowComparison(installs, [], attributes, 0, asOf + 1, asOf);
  assert.deepEqual(report.rows.map((row) => row.installs), [4, 0, 0, 0]);
});

test("Poky Data shows all four clickable onboarding rows, then paywall flows, without a price table", () => {
  const definition = userJourneyDefinition("poky")!;
  const installs = definition.variants.map((variant) => install(variant.key));
  const attributes = new Map(definition.variants.map((variant) => [variant.key, { ...definition.cohortAttributes,
    [definition.variantAttribute]: variant.key, ...assignment() }]));
  const journey = withJourneyConversions(buildUserJourney(definition, []), "poky", installs, [], attributes, start, end, asOf);
  assert.deepEqual(journey.variants.map((row) => row.conversions!.global.installs), [1, 1, 1, 1]);
  const html = renderToStaticMarkup(createElement(AppOverviewPanel, { appId: "poky", installs: 4, windowLabel: "Last 7 days",
    trend: [], countries: [], plans: [], retention: [], userJourney: journey,
    paywallFlowComparison: buildPokyPaywallFlowComparison(installs, [], attributes, start, end, asOf) }));
  for (const label of ["No intro · Plan A", "No intro · Plan B", "Animated intro · Plan A", "Animated intro · Plan B",
    "HP (hard paywall)", "3-day trial", "APPU lift", "Win %", "Refund rate"]) assert.ok(html.includes(label), label);
  assert.equal((html.match(/aria-label="View screens for/g) ?? []).length, 8);
  assert.match(html, /aria-label="View screens for HP \(hard paywall\)"/);
  assert.match(html, /aria-label="View screens for 3-day trial"/);
  assert.equal((html.match(/Installed on v1\.1\.5\+/g) ?? []).length, 2);
  assert.ok(html.indexOf("Paywall flows") > html.indexOf("User journey"));
  assert.doesNotMatch(html, /Yearly prices|Price points/);
});

test("seven-day trials include nonpayers, direct purchases, linked renewals and refunds", () => {
  const attributes = new Map(["seven", "free", "direct"].map((id) => [id, assignment("trial_7d")]));
  const report = buildPokyPaywallFlowComparison([...attributes.keys()].map((id) => install(id)), [
    event("seven", { periodType: "trial", netProceeds: 0, expiresAt: start + 8 * day }),
    event("", { originalTransactionId: "seven", transactionId: "converted", name: "renewal", eventTs: start + 8 * day }),
    event("", { originalTransactionId: "seven", transactionId: "converted", name: "cancellation", isRefund: true, netProceeds: -2, eventTs: start + 10 * day }),
    event("direct"),
  ], attributes, start, end, asOf);
  assert.deepEqual(report.rows.map((row) => row.installs), [0, 0, 3, 0]);
  const metric = report.rows[2].conversions!.global;
  assert.equal(metric.trials, 1);
  assert.equal(metric.paid, 1);
  assert.equal(metric.installPaid, 2);
  assert.equal(metric.proceeds, 22);
  assert.equal(metric.refunds, 1);
});

test("unchanged 50/50 flows join the main table while mismatched allocations stay excluded", () => {
  const report = buildPokyPaywallFlowComparison([install("old"), install("new"), install("bad")], [], new Map([
    ["old", assignment("trial", { onboarding_offer_experiment: "poky_onboarding_trial_v1", onboarding_offer_allocation: "50_50" })],
    ["new", assignment("trial_7d")], ["bad", assignment("trial_7d", { onboarding_offer_allocation: "50_50" })],
  ]), start, end, asOf);
  assert.deepEqual(report.rows.map((row) => row.installs), [0, 1, 1, 0]);
  assert.equal("legacy" in report, false);
  assert.equal("previous" in report, false);
});

test("pooling only accepts the variant and allocation actually shipped in each release", () => {
  for (const [experiment, allocation, valid] of [
    ["poky_onboarding_trial_v1", "50_50", ["current", "trial"]],
    ["poky_onboarding_trial_v2", "25_25_50", ["current", "trial", "trial_7d"]],
    ["poky_onboarding_trial_v3", "25_25_25_25", ["current", "trial", "trial_7d", "trial_7d_mascot"]],
  ] as const) {
    for (const variant of ["current", "trial", "trial_7d", "trial_7d_mascot", "unknown"]) {
      const attrs = assignment(variant, { onboarding_offer_experiment: experiment, onboarding_offer_allocation: allocation });
      assert.equal(isPokyOfferAssignment(attrs), (valid as readonly string[]).includes(variant));
      assert.equal(isPokyOfferAssignment({ ...attrs, onboarding_offer_allocation: "legacy" }), false);
      assert.equal(isPokyOfferAssignment({ ...attrs, poky_us_hp_override_seen: "true" }), false);
      assert.equal(isPokyOfferAssignment({ ...attrs, onboarding_offer_experiment: "unknown" }), false);
    }
  }
});

test("dashboard fills the main table from collected results before the four-way rollout", () => {
  const report = buildPokyPaywallFlowComparison([install("old")], [], new Map([
    ["old", assignment("trial", { onboarding_offer_experiment: "poky_onboarding_trial_v1", onboarding_offer_allocation: "50_50" })],
  ]), start, end, asOf);
  const html = renderToStaticMarkup(createElement(PokyPaywallFlowTable, { report, windowLabel: "All time" }));
  assert.equal(report.status, "ready");
  assert.deepEqual(report.rows.map((row) => row.installs), [0, 1, 0, 0]);
  assert.match(html, /HP 25% · 3-day trial 25% · 7-day current 25% · 7-day mascot 25%/);
  assert.doesNotMatch(html, /Waiting for new assignments|Previous paywall flows/);
  assert.match(html, /View screens for 7-day trial/);
});


test("temporary US hard-paywall exposure is excluded even with a saved trial assignment", () => {
  const report = buildPokyPaywallFlowComparison([install("forced"), install("normal")], [], new Map([
    ["forced", assignment("trial_7d", { poky_us_hp_override_seen: "true" })],
    ["normal", assignment("trial_7d")],
  ]), start, end, asOf);
  assert.deepEqual(report.rows.map((row) => row.installs), [0, 0, 1, 0]);
});


test("the two seven-day designs retain independent nonpayer, purchase and refund cohorts", () => {
  const report = buildPokyPaywallFlowComparison([install("text"), install("mascot"), install("free"), install("v2")], [
    event("text", { netProceeds: 10 }),
    event("mascot", { netProceeds: 30 }),
    event("mascot", { name: "cancellation", isRefund: true, netProceeds: -5 }),
  ], new Map([
    ["text", assignment("trial_7d")], ["mascot", assignment("trial_7d_mascot")], ["free", assignment("trial_7d_mascot")],
    ["v2", assignment("trial_7d", { onboarding_offer_experiment: "poky_onboarding_trial_v2", onboarding_offer_allocation: "25_25_50" })],
  ]), start, end, asOf);
  assert.deepEqual(report.rows.map((row) => row.installs), [0, 0, 2, 2]);
  assert.equal(report.rows[2].conversions!.global.proceeds, 10);
  assert.equal(report.rows[3].conversions!.global.proceeds / report.rows[3].installs, 12.5);
  const html = renderToStaticMarkup(createElement(PokyPaywallFlowTable, { report, windowLabel: "All time" }));
  assert.doesNotMatch(html, /Previous paywall flows/);
  assert.match(html, /View screens for 7-day trial · mascot/);
});

test("pooled flows retain old nonpayers, purchases and anonymous renewals/refunds without double counting", () => {
  const attributes = new Map([
    ["hp-v1", assignment("current", { onboarding_offer_experiment: "poky_onboarding_trial_v1", onboarding_offer_allocation: "50_50" })],
    ["trial-v1", assignment("trial", { onboarding_offer_experiment: "poky_onboarding_trial_v1", onboarding_offer_allocation: "50_50" })],
    ["hp-v2", assignment("current", { onboarding_offer_experiment: "poky_onboarding_trial_v2", onboarding_offer_allocation: "25_25_50" })],
    ["trial-v3", assignment("trial")],
  ]);
  const renewal = event("", { originalTransactionId: "trial-v1", transactionId: "renewed", name: "renewal", eventTs: start + 5 * day, netProceeds: 20 });
  const report = buildPokyPaywallFlowComparison([...attributes.keys()].flatMap((id) => [install(id), install(id)]), [
    event("hp-v1"),
    event("trial-v1", { periodType: "trial", netProceeds: 0, expiresAt: start + 4 * day }),
    renewal, renewal,
    event("", { originalTransactionId: "trial-v1", transactionId: "renewed", name: "cancellation", isRefund: true, netProceeds: -5, eventTs: start + 10 * day }),
    event("trial-v3", { netProceeds: 10 }),
  ], attributes, start, end, asOf);
  assert.deepEqual(report.rows.map((row) => row.installs), [2, 2, 0, 0]);
  assert.equal(report.rows[0].conversions!.global.proceeds, 12);
  const trial = report.rows[1].conversions!.global;
  assert.equal(trial.proceeds, 25);
  assert.equal(trial.proceeds / trial.installs, 12.5);
  assert.equal(trial.trials, 1);
  assert.equal(trial.installPaid, 2);
  assert.equal(trial.refunds, 1);
});
