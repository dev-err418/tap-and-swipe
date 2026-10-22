import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppOverviewPanel from "../../components/analytics/AppOverviewPanel";
import PokyPaywallFlowTable from "../../components/analytics/PokyPaywallFlowTable";
import { buildPokyPaywallFlowComparison } from "../../lib/poky-paywall-flow-cohorts";
import { POKY_ONBOARDING_OFFER_EXPERIMENT } from "../../lib/poky-trial-offer";
import { buildUserJourney, userJourneyDefinition } from "../../lib/user-journey";
import { withJourneyConversions } from "../../lib/journey-cohort-conversions";

const day = 86_400_000, start = Date.parse("2026-10-01T00:00:00Z"), end = start + 7 * day, asOf = start + 20 * day;
const install = (appUserId: string, installedAt = start) => ({ appUserId, installedAt, appVersion: "1.1.5" });
const assignment = (variant = "current", extra = {}) => ({ poky_tracking_environment: "production",
  onboarding_offer_experiment: POKY_ONBOARDING_OFFER_EXPERIMENT, onboarding_offer_allocation: "25_25_50",
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
  assert.deepEqual(report.rows.map((row) => row.installs), [1, 2, 0]);
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
  assert.deepEqual(report.rows.map((row) => row.installs), [0, 0, 0]);
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
  assert.deepEqual(report.rows.map((row) => row.installs), [4, 0, 0]);
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
  assert.equal((html.match(/aria-label="View screens for/g) ?? []).length, 7);
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
  assert.deepEqual(report.rows.map((row) => row.installs), [0, 0, 3]);
  const metric = report.rows[2].conversions!.global;
  assert.equal(metric.trials, 1);
  assert.equal(metric.paid, 1);
  assert.equal(metric.installPaid, 2);
  assert.equal(metric.proceeds, 22);
  assert.equal(metric.refunds, 1);
});

test("old 50/50 assignments stay visible separately and never enter the 25/25/50 test", () => {
  const report = buildPokyPaywallFlowComparison([install("old"), install("new"), install("bad")], [], new Map([
    ["old", assignment("trial", { onboarding_offer_experiment: "poky_onboarding_trial_v1", onboarding_offer_allocation: "50_50" })],
    ["new", assignment("trial_7d")], ["bad", assignment("trial_7d", { onboarding_offer_allocation: "50_50" })],
  ]), start, end, asOf);
  assert.deepEqual(report.rows.map((row) => row.installs), [0, 0, 1]);
  assert.deepEqual(report.legacy!.rows.map((row) => row.installs), [0, 1]);
});

test("dashboard waits for the three-way rollout while keeping previous results visible", () => {
  const report = buildPokyPaywallFlowComparison([install("old")], [], new Map([
    ["old", assignment("trial", { onboarding_offer_experiment: "poky_onboarding_trial_v1", onboarding_offer_allocation: "50_50" })],
  ]), start, end, asOf);
  const html = renderToStaticMarkup(createElement(PokyPaywallFlowTable, { report, windowLabel: "All time" }));
  assert.equal(report.status, "empty");
  assert.equal(report.legacy!.status, "ready");
  assert.match(html, /HP 25% · 3-day trial 25% · 7-day trial 50%/);
  assert.match(html, /Waiting for new assignments/);
  assert.match(html, /Previous paywall flows · 50\/50/);
  assert.match(html, /View screens for 7-day trial/);
});
