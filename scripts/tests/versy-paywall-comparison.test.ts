import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildVersyPaywallComparison, VERSY_ONBOARDING_ASSIGNMENT_ATTRIBUTE } from "../../lib/versy-paywall-comparison";
import { buildAppCountryComparisons } from "../../lib/app-country-comparisons";
import VersyPaywallComparisonPanel from "../../components/analytics/VersyPaywallComparisonPanel";
import { VERSY_YEARLY_PRICES } from "../../lib/versy-yearly-price-cohorts";

const hour = 3_600_000, start = Date.parse("2026-10-20T00:00:00Z"), asOf = start + 72 * hour;
const install = (appUserId: string, extra = {}) => ({ appUserId, country: "US", appVersion: "1.2.6", installedAt: start, ...extra });
const assignment = (extra = {}) => ({ country: "US", versy_tracking_environment: "production",
  onboarding_experiment_id: "scroll_the_bible_v1", onboarding_variant: "bible_widget",
  onboarding_paywall_experiment_id: "versy_yearly_paywalls_v1", onboarding_paywall_access_variant: "hard",
  yearly_price_experiment_id: "versy_yearly_price_v3", yearly_price_allocation: "50_50",
  yearly_price_product_id: VERSY_YEARLY_PRICES[0].productID, yearly_price_assigned_at: String(start), ...extra });
type Event = Parameters<typeof buildAppCountryComparisons>[0]["events"][number];
const event = (appUserId: string, extra: Partial<Event> = {}): Event => ({ appUserId, originalTransactionId: appUserId,
  transactionId: appUserId, name: "initial_purchase", periodType: "trial", netProceeds: 0, isRefund: false, isTrialConversion: false,
  eventTs: start + hour, attributionTs: start + hour, expiresAt: start + 170 * hour, ...extra });
const enrollment = (extra = {}) => JSON.stringify({ schema: 1, environment: "production",
  experiment: "versy_onboarding_outcomes_v1", experimentName: "Onboarding outcomes",
  variant: "bible_widget", variantName: "Bible Widget", paywall: "bible_widget", language: "en",
  assignedAt: start, randomized: false, variantCount: 3, expectedProduct: VERSY_YEARLY_PRICES[0].productID, ...extra });

test("original enrollment retains both trial lengths, direct purchases and non-payers across price migrations", () => {
  const later = start + 10 * 24 * hour;
  const attrs = new Map([
    ["seven", assignment({ yearly_price_assigned_at: String(start + 9 * 24 * hour),
      [VERSY_ONBOARDING_ASSIGNMENT_ATTRIBUTE]: enrollment() })],
    ["nonpayer", assignment({ [VERSY_ONBOARDING_ASSIGNMENT_ATTRIBUTE]: enrollment() })],
    ...["three", "three-nonpayer"].map((id) => [id, assignment({
      [VERSY_ONBOARDING_ASSIGNMENT_ATTRIBUTE]: enrollment({ expectedProduct: `${VERSY_YEARLY_PRICES[0].productID}.trial3` }),
    })] as const),
  ]);
  const report = buildVersyPaywallComparison([...attrs.keys()].map((id) => install(id)), [
    event("seven"),
    event("seven", { originalTransactionId: "seven-weekly", transactionId: "weekly", periodType: "normal",
      netProceeds: 5, eventTs: start + 2 * hour }),
    event("", { originalTransactionId: "seven", transactionId: "renewal", name: "renewal", periodType: "normal",
      netProceeds: 30, eventTs: start + 8 * 24 * hour }),
    event("", { originalTransactionId: "seven", transactionId: "renewal", name: "cancellation", periodType: "normal",
      isRefund: true, netProceeds: -5, eventTs: start + 9 * 24 * hour }),
    event("three", { expiresAt: start + 73 * hour }),
    event("", { originalTransactionId: "three", transactionId: "three-renewal", name: "renewal", periodType: "normal",
      netProceeds: 40, eventTs: start + 74 * hour }),
  ], attrs, later);
  const metric = report.rows[0].conversions!.global;
  assert.deepEqual([metric.installs, metric.trials, metric.finishedTrials, metric.paid, metric.installPaid, metric.proceeds, metric.refunds],
    [4, 2, 2, 2, 2, 70, 1]);
  assert.equal(metric.proceeds / metric.installs, 17.5);
  assert.equal(report.checkpoints.hard[0].trials, 2);
  assert.equal(report.warnings.length, 0);
});

test("mixed trial lengths use their actual expiry and include Mexico and unknown-country revenue", () => {
  const observedAt = start + 96 * hour;
  const attrs = new Map([
    ["three", assignment({ country: "MX", yearly_price_experiment_id: "versy_yearly_price_v4",
      yearly_price_allocation: "25_25_25_25", yearly_price_product_id: `${VERSY_YEARLY_PRICES[0].productID}.trial3` })],
    ["seven", assignment({ country: "" })],
    ["conflicting", assignment({ country: "FR" })],
  ]);
  const report = buildVersyPaywallComparison([
    install("three", { country: "MX" }), install("seven", { country: "unknown" }), install("conflicting"),
  ], [
    event("three", { expiresAt: start + 73 * hour }),
    event("", { originalTransactionId: "three", transactionId: "renewal", name: "renewal", periodType: "normal",
      netProceeds: 30, eventTs: start + 74 * hour }),
    event("seven"),
    event("conflicting", { periodType: "normal", netProceeds: 10 }),
  ], attrs, observedAt);
  const metric = report.rows[0].conversions!.global;
  assert.deepEqual([metric.installs, metric.trials, metric.finishedTrials, metric.paid, metric.installPaid, metric.proceeds],
    [3, 2, 1, 1, 2, 40]);
  assert.equal(metric.missingProceeds, false);
});

test("present but invalid original enrollment cannot fall back to mutable price attributes", () => {
  const attrs = new Map([
    ["corrupt", assignment({ [VERSY_ONBOARDING_ASSIGNMENT_ATTRIBUTE]: "{" })],
    ["sandbox", assignment({ [VERSY_ONBOARDING_ASSIGNMENT_ATTRIBUTE]: enrollment({ environment: "sandbox" }) })],
    ["wrong-flow", assignment({ [VERSY_ONBOARDING_ASSIGNMENT_ATTRIBUTE]: enrollment({ variant: "scroll_the_bible", paywall: "scroll_the_bible" }) })],
    ["future", assignment({ [VERSY_ONBOARDING_ASSIGNMENT_ATTRIBUTE]: enrollment({ assignedAt: asOf + hour }) })],
    ["legacy", assignment()],
  ]);
  const report = buildVersyPaywallComparison([...attrs.keys()].map((id) => install(id)), [], attrs, asOf);
  assert.equal(report.rows[0].installs, 1);
  assert.equal(report.warnings.length, 2);
});

test("all countries and trial offers enter; widget flows pool and Scroll ignores its access draw", () => {
  const attrs = new Map([
    ["full", assignment()], ["short", assignment({ onboarding_variant: "bible_widget_shorter" })],
    ["soft", assignment({ onboarding_paywall_access_variant: "dismissible" })],
    ["scroll", assignment({ onboarding_variant: "scroll_the_bible" })],
    ["retired7", assignment({ yearly_price_experiment_id: "versy_yearly_price_v4", yearly_price_allocation: "25_25_25_25" })],
    ["retired3", assignment({ yearly_price_experiment_id: "versy_yearly_price_v4", yearly_price_allocation: "25_25_25_25", yearly_price_product_id: `${VERSY_YEARLY_PRICES[0].productID}.trial3` })],
    ["migrated", assignment({ yearly_price_allocation: "migrated" })],
    ["old", assignment()], ["dev", assignment({ versy_tracking_environment: "development" })],
    ["mx", assignment({ country: "MX" })], ["conflict", assignment({ country: "FR" })],
    ["unknown", assignment({ country: "" })], ["bad-time", assignment({ yearly_price_assigned_at: "" })],
    ["future", assignment({ yearly_price_assigned_at: String(asOf + hour) })],
    ["old-access", assignment({ onboarding_paywall_experiment_id: "retired" })],
  ]);
  const report = buildVersyPaywallComparison([
    install("old", { appVersion: "1.2.5", installedAt: start - hour }),
    ...[...attrs.keys()].map((id) => install(id)), install("full"),
  ], [], attrs, asOf);
  assert.deepEqual(report.rows.map((row) => row.installs), [8, 1, 1]);
  assert.deepEqual(report.checkpoints.hard.map((point) => point.installs), [8, 8]);
  assert.equal(report.warnings.length, 1);
  assert.doesNotMatch(JSON.stringify(report), /appUserId|originalTransactionId|transactionId/);
});

test("24h and 48h outcomes freeze cancellations and payments at each user's enrollment checkpoint", () => {
  const attrs = new Map(["cancel-later", "cancel-early", "keep", "paid", "both", "free", "recent", "late-assignment"]
    .map((id) => [id, assignment(id === "late-assignment" ? { yearly_price_assigned_at: String(start + 30 * hour) } : {})]));
  const installs = [...attrs.keys()].map((id) => install(id, id === "recent" ? { installedAt: start + 40 * hour } : {}));
  const report = buildVersyPaywallComparison(installs, [
    event("cancel-later"), event("", { originalTransactionId: "cancel-later", name: "cancellation", eventTs: start + 30 * hour }),
    event("cancel-early"), event("alias", { originalTransactionId: "cancel-early", name: "cancellation", eventTs: start + 20 * hour }),
    event("keep"), event("", { originalTransactionId: "keep", name: "cancellation", eventTs: start + 80 * hour }),
    event("paid", { periodType: "normal", netProceeds: 20 }),
    event("both"), event("both", { originalTransactionId: "both-paid", periodType: "normal", netProceeds: 10, eventTs: start + 25 * hour }),
    event("recent", { eventTs: start + 41 * hour }),
    event("late-assignment"), // Before assignment, with a later renewal: neither belongs to this cohort.
    event("", { originalTransactionId: "late-assignment", name: "renewal", periodType: "normal", netProceeds: 30, eventTs: start + 35 * hour }),
  ], attrs, asOf);
  const [at24, at48] = report.checkpoints.hard;
  assert.deepEqual([at24.installs, at24.trials, at24.uncancelledTrials, at24.paid, at24.uncancelledOrPaid], [8, 5, 4, 1, 5]);
  assert.deepEqual([at48.installs, at48.trials, at48.uncancelledTrials, at48.paid, at48.uncancelledOrPaid], [6, 4, 2, 2, 3]);
  assert.equal(report.rows[0].conversions!.global.proceeds, 30);
  assert.equal(report.rows[0].conversions!.global.finishedTrials, 0);
});

test("expiry and missing data are explicit, and no immature user is counted as a failure", () => {
  const attrs = new Map(["expired", "missing", "paid-unknown", "recent"].map((id) => [id, assignment()]));
  const report = buildVersyPaywallComparison([...attrs.keys()].map((id) => install(id, id === "recent" ? { installedAt: asOf - hour } : {})), [
    event("expired", { expiresAt: start + 40 * hour }), event("missing", { expiresAt: 0 }),
    event("paid-unknown", { periodType: "normal", netProceeds: null }),
  ], attrs, asOf);
  assert.equal(report.checkpoints.hard[0].uncancelledTrials, 1);
  assert.equal(report.checkpoints.hard[1].uncancelledTrials, 0);
  for (const point of report.checkpoints.hard) {
    assert.equal(point.installs, 3);
    assert.equal(point.missingTrialExpiry, true);
    assert.equal(point.missingMoney, true);
  }

});

test("country slicing rebuilds the comparison, retaining anonymous transaction follow-ups", () => {
  const report = buildAppCountryComparisons({ appId: "versy", asOf, journey: null,
    countries: [{ country: "US", proceeds: 0 }, { country: "FR", proceeds: 0 }, { country: "MX", proceeds: 0 }],
    installs: [install("us"), install("fr", { country: "FR" }), install("mx", { country: "MX" })],
    attributes: new Map([["us", assignment()], ["fr", assignment({ country: "FR" })], ["mx", assignment({ country: "MX" })]]),
    events: [event("us"), event("fr"), event("mx"), event("", { originalTransactionId: "us", name: "cancellation", eventTs: start + 30 * hour })],
  });
  assert.equal(report.slices.US.versyPaywallComparison!.checkpoints.hard[1].uncancelledTrials, 0);
  assert.equal(report.slices.FR.versyPaywallComparison!.checkpoints.hard[1].uncancelledTrials, 1);
  assert.equal(report.slices.MX.versyPaywallComparison!.status, "ready");
  assert.equal(report.slices.MX.versyPaywallComparison!.rows[0].conversions!.global.trials, 1);
  const html = renderToStaticMarkup(createElement(VersyPaywallComparisonPanel, { report: report.slices.US.versyPaywallComparison! }));
  assert.ok(html.indexOf("Onboarding paywalls") < html.indexOf("Paywall flows · note variants"));
  assert.match(html, /Hard Widget/);
  assert.match(html, /All countries and trial lengths/);
  assert.doesNotMatch(html, /7-day trials|excludes Mexico/);
  assert.doesNotMatch(html, /<details|<summary/);
  assert.match(renderToStaticMarkup(createElement(VersyPaywallComparisonPanel, { report: null })), /comparison is unavailable/);
});
