import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppOverviewPanel from "../../components/analytics/AppOverviewPanel";
import VersyYearlyPriceTable from "../../components/analytics/VersyYearlyPriceTable";
import { buildVersyYearlyPriceComparison, VERSY_CURRENT_YEARLY_PRICE_EXPERIMENT, VERSY_CURRENT_YEARLY_PRICES, VERSY_RECOVERY_PRICE_EXPERIMENT, VERSY_RECOVERY_PRICES, VERSY_YEARLY_PRICE_EXPERIMENT, VERSY_RETIRED_YEARLY_PRICE_EXPERIMENT, VERSY_YEARLY_PRICES } from "../../lib/versy-yearly-price-cohorts";
import { buildUserJourney, userJourneyDefinition } from "../../lib/user-journey";
import { VERSY_FIXED_YEARLY_PRICE, isVersyFixedYearlyPriceAssignment } from "../../lib/versy-paywall-policy";
import { buildAppCountryComparisons } from "../../lib/app-country-comparisons";

const day = 86_400_000, start = Date.parse("2026-11-20T00:00:00Z"), asOf = start + 20 * day;
const install = (appUserId: string, appVersion = "1.2.6") => ({ appUserId, appVersion, installedAt: start });
const assignment = (price = 0, extra = {}) => ({
  versy_tracking_environment: "production", yearly_price_experiment_id: VERSY_YEARLY_PRICE_EXPERIMENT,
  yearly_price_product_id: VERSY_YEARLY_PRICES[price].productID, yearly_price_allocation: "50_50",
  yearly_price_assigned_at: String(start - 1000), ...extra,
});
type Event = Parameters<typeof buildAppCountryComparisons>[0]["events"][number];
const event = (appUserId: string, extra: Partial<Event> = {}): Event => ({ appUserId, originalTransactionId: appUserId,
  transactionId: appUserId, name: "initial_purchase", periodType: "normal", netProceeds: 12, isRefund: false, isTrialConversion: false,
  eventTs: start + day, attributionTs: start + day, expiresAt: 0, ...extra });

const fixedAssignment = (extra = {}) => assignment(1, {
  yearly_price_experiment_id: VERSY_FIXED_YEARLY_PRICE.experiment,
  yearly_price_allocation: VERSY_FIXED_YEARLY_PRICE.allocation, ...extra,
});

const currentAssignment = (main: number, recovery: number, extra = {}) => ({
  versy_tracking_environment: "production",
  yearly_price_experiment_id: VERSY_CURRENT_YEARLY_PRICE_EXPERIMENT,
  yearly_price_allocation: "equal_thirds",
  yearly_price_product_id: VERSY_CURRENT_YEARLY_PRICES[main].productID,
  yearly_price_assigned_at: String(start),
  recovery_price_experiment_id: VERSY_RECOVERY_PRICE_EXPERIMENT,
  recovery_price_allocation: "50_50",
  recovery_price_product_id: VERSY_RECOVERY_PRICES[recovery].productID,
  recovery_price_assigned_at: String(start),
  ...extra,
});

test("three main arms cross independently with both recovery arms without mixing historical assignments", () => {
  const attributes = new Map<string, Record<string, string>>();
  for (let main = 0; main < 3; main++) for (let recovery = 0; recovery < 2; recovery++) {
    attributes.set(`${main}-${recovery}`, currentAssignment(main, recovery));
  }
  attributes.set("historical", assignment());
  attributes.set("fixed", fixedAssignment());
  attributes.set("obsolete-two-arm", currentAssignment(0, 0, {
    yearly_price_experiment_id: "versy_yearly_price_3499_4999_v1", recovery_price_experiment_id: "obsolete",
  }));
  const report = buildVersyYearlyPriceComparison([...attributes.keys()].map((id) => install(id)), [
    event("0-0", { productId: VERSY_RECOVERY_PRICES[0].productID }),
    event("", { originalTransactionId: "0-0", name: "renewal", transactionId: "renewal", netProceeds: 8, eventTs: start + 10 * day }),
    event("", { originalTransactionId: "0-0", name: "cancellation", transactionId: "renewal", isRefund: true, netProceeds: -2, eventTs: start + 11 * day }),
    event("1-1", { productId: VERSY_CURRENT_YEARLY_PRICES[1].productID }),
    event("fixed"), event("historical"), event("obsolete-two-arm"),
  ], attributes, asOf);
  assert.deepEqual(report.current.rows.map((r) => r.installs), [2, 2, 2]);
  assert.deepEqual(report.recovery.rows.map((r) => r.installs), [3, 3]);
  assert.deepEqual(report.current.rows.map((r) => r.conversions!.global.proceeds), [18, 12, 0]);
  assert.deepEqual(report.recovery.rows.map((r) => r.conversions!.global.proceeds), [18, 12]);
  assert.equal(report.recovery.rows[0].conversions!.global.refunds, 1);
  assert.equal(report.current.rows[0].conversions!.global.proceeds / report.current.rows[0].installs, 9);
  assert.deepEqual(report.rows.map((r) => r.installs), [1, 0]);
  assert.equal(report.rollout.rows[0].installs, 1);
  assert.deepEqual(Object.values(report.current.labels), ["€39.99/year (7d)", "€44.99/year (7d)", "€49.99/year (7d)"]);
  const html = renderToStaticMarkup(createElement(VersyYearlyPriceTable, { report }));
  const mainIndex = html.indexOf("Yearly prices · A/B test"), recoveryIndex = html.indexOf("Recovery prices · A/B test");
  assert.ok(mainIndex >= 0 && recoveryIndex > mainIndex);
  assert.doesNotMatch(html, /Yearly price · historical fixed|Yearly prices · historical test/);
  for (const label of ["€44.99/year", "€19.99/year", "€24.99/year", "Equal thirds", "50/50 · independent"]) assert.ok(html.includes(label), label);
});

test("current tests reject invalid metadata independently and use their own assignment cutoff", () => {
  const attributes = new Map([
    ["different-times", currentAssignment(0, 0, { recovery_price_assigned_at: String(start + 2 * day) })],
    ["invalid-main", currentAssignment(1, 1, { yearly_price_assigned_at: "" })],
    ["future-recovery", currentAssignment(2, 0, { recovery_price_assigned_at: String(asOf + 1) })],
    ["debug", currentAssignment(0, 0, { versy_tracking_environment: "development" })],
    ["allocations", currentAssignment(0, 0, { yearly_price_allocation: "50_50", recovery_price_allocation: "fixed" })],
    ["products", currentAssignment(0, 0, { yearly_price_product_id: "unknown", recovery_price_product_id: "unknown" })],
    ["old-install", currentAssignment(0, 0)],
  ]);
  const report = buildVersyYearlyPriceComparison([...attributes.keys()].map((id) => install(id, id === "old-install" ? "1.2.5" : "1.3.6")), [
    event("different-times"),
    event("different-times", { name: "renewal", transactionId: "old-renewal", eventTs: start + 3 * day }),
    event("different-times", { originalTransactionId: "new-chain", transactionId: "new", eventTs: start + 4 * day, netProceeds: 5 }),
  ], attributes, asOf);
  assert.deepEqual(report.current.rows.map((r) => r.installs), [1, 0, 1]);
  assert.deepEqual(report.recovery.rows.map((r) => r.installs), [1, 1]);
  assert.equal(report.current.rows[0].conversions!.global.proceeds, 29);
  assert.equal(report.recovery.rows[0].conversions!.global.proceeds, 5);
  assert.equal(report.current.warnings.length, 1);
  assert.equal(report.recovery.warnings.length, 1);
});

test("country filters apply to both new price tests", () => {
  const attributes = new Map([["fr", currentAssignment(1, 0)], ["de", currentAssignment(2, 1)], ["us", currentAssignment(0, 1)]]);
  const result = buildAppCountryComparisons({ appId: "versy", asOf, journey: null, attributes,
    installs: [...attributes.keys()].map((id) => ({ ...install(id), country: id.toUpperCase() })),
    countries: [{ country: "FR", proceeds: 12 }, { country: "DE", proceeds: 12 }, { country: "US", proceeds: 12 }], events: [],
  });
  assert.deepEqual(result.slices.FR.yearlyPriceComparison!.current.rows.map((r) => r.installs), [0, 1, 0]);
  assert.deepEqual(result.slices.DE.yearlyPriceComparison!.recovery.rows.map((r) => r.installs), [0, 1]);
  assert.deepEqual(result.slices.US.yearlyPriceComparison!.current.rows.map((r) => r.installs), [1, 0, 0]);
});

test("fixed rollout is isolated from both historical price arms, including after an upgrade", () => {
  const attributes = new Map([
    ["old39", assignment()], ["old49", assignment(1)], ["free", fixedAssignment()],
    ["upgraded", fixedAssignment({ yearly_price_assigned_at: String(start + 2 * day) })],
    ["bad-sku", fixedAssignment({ yearly_price_product_id: VERSY_YEARLY_PRICES[0].productID })],
    ["bad-allocation", fixedAssignment({ yearly_price_allocation: "50_50" })],
    ["debug", fixedAssignment({ versy_tracking_environment: "development" })],
    ["future", fixedAssignment({ yearly_price_assigned_at: String(asOf + 1) })],
  ]);
  const report = buildVersyYearlyPriceComparison([...attributes.keys()].map((id) => install(id)), [
    event("old39"), event("old49"), event("upgraded"),
    event("upgraded", { name: "renewal", transactionId: "old-renewal", eventTs: start + 3 * day }),
    event("upgraded", { originalTransactionId: "new-chain", transactionId: "new", eventTs: start + 4 * day, netProceeds: 30 }),
    event("", { originalTransactionId: "new-chain", transactionId: "new", name: "cancellation", isRefund: true, eventTs: start + 5 * day, netProceeds: -5 }),
  ], attributes, asOf);
  assert.deepEqual(report.rows.map((r) => r.installs), [1, 1]);
  const rollout = report.rollout.rows[0].conversions!.global;
  assert.equal(rollout.installs, 2);
  assert.equal(rollout.proceeds, 25);
  assert.equal(rollout.installPaid, 1);
  assert.equal(report.rollout.warnings.length, 1);
  assert.equal(isVersyFixedYearlyPriceAssignment(assignment(1)), false);
  const html = renderToStaticMarkup(createElement(VersyYearlyPriceTable, { report }));
  assert.doesNotMatch(html, /Yearly price · historical fixed|Yearly prices · historical test/);
});

test("country slices retain the same fixed-versus-historical separation", () => {
  const attributes = new Map([["us-fixed", fixedAssignment()], ["fr-fixed", fixedAssignment()], ["us-old", assignment(1)]]);
  const result = buildAppCountryComparisons({ appId: "versy", asOf, journey: null, attributes,
    installs: [...attributes.keys()].map((id) => ({ ...install(id), country: id.startsWith("fr") ? "FR" : "US" })),
    countries: [{ country: "US", proceeds: 12 }, { country: "FR", proceeds: 6 }],
    events: [],
  });
  assert.deepEqual(result.slices.US.yearlyPriceComparison!.rows.map((r) => r.installs), [0, 1]);
  assert.equal(result.slices.US.yearlyPriceComparison!.rollout.rows[0].installs, 1);
  assert.equal(result.slices.FR.yearlyPriceComparison!.rollout.rows[0].installs, 1);
});

test("the two saved price assignments retain nonpayers, trials, weekly purchases, renewals and refunds", () => {
  const attributes = new Map([["payer", assignment()], ["free", assignment()], ["weekly", assignment(1)]]);
  const renewal = event("", { originalTransactionId: "payer", name: "renewal", transactionId: "renewal", netProceeds: 8, eventTs: start + 10 * day });
  const report = buildVersyYearlyPriceComparison([install("payer"), install("free"), install("weekly")], [
    event("payer", { periodType: "trial", netProceeds: 0, expiresAt: start + 8 * day }),
    renewal, renewal, event("payer", { name: "cancellation", transactionId: "renewal", isRefund: true, netProceeds: -2, eventTs: start + 11 * day }),
    event("weekly"), event("outsider"),
  ], attributes, asOf);
  assert.equal(report.status, "ready");
  assert.deepEqual(report.rows.map((row) => row.installs), [2, 1]);
  const first = report.rows[0].conversions!.global;
  assert.equal(first.proceeds / first.installs, 3);
  assert.equal(first.proceedsVariance, 18);
  assert.equal(first.trials, 1);
  assert.equal(first.paid, 1);
  assert.equal(first.purchases, 1);
  assert.equal(first.refunds, 1);
  assert.equal(report.rows[1].conversions!.global.proceeds, 12);
  assert.deepEqual(Object.values(report.labels), ["$39.99/year (7d)", "$49.99/year (7d)"]);
  assert.deepEqual(report.warnings, []);
});

test("legacy prices, migrated users, debug assignments, older install versions and missing times do not enter", () => {
  const attributes = new Map([
    ["valid", assignment()], ["old-price", assignment(0, { yearly_price_experiment_id: "versy_yearly_price_v2" })],
    ["migrated", assignment(0, { yearly_price_allocation: "migrated" })], ["debug", assignment(0, { versy_tracking_environment: "development" })],
    ["older-install", assignment()], ["unknown-product", assignment(0, { yearly_price_product_id: "retired" })],
    ["missing-time", assignment(0, { yearly_price_assigned_at: "" })],
  ]);
  const report = buildVersyYearlyPriceComparison([...attributes.keys()].map((id) => install(id, id === "older-install" ? "1.2.5" : "1.2.6")),
    [event("valid", { netProceeds: null }), event("migrated"), event("debug")], attributes, asOf);
  assert.deepEqual(report.rows.map((row) => row.installs), [1, 0]);
  assert.equal(report.rows[0].conversions!.global.missingProceeds, true);
  assert.equal(report.warnings.length, 1);
});

test("outcomes begin after both assignment and install; old subscription chains stay excluded", () => {
  const report = buildVersyYearlyPriceComparison([install("user")], [
    event("user"), event("user", { name: "renewal", transactionId: "old-renewal", eventTs: start + 3 * day }),
    event("user", { originalTransactionId: "new-chain", transactionId: "new", eventTs: start + 4 * day, netProceeds: 5 }),
  ], new Map([["user", assignment(0, { yearly_price_assigned_at: String(start + 2 * day) })]]), asOf);
  assert.equal(report.rows[0].conversions!.global.proceeds, 5);
  assert.equal(report.rows[0].conversions!.global.purchases, 1);
});

test("Versy shows current price tests below User journey without historical cards", () => {
  const report = buildVersyYearlyPriceComparison([], [], new Map(), asOf);
  const html = renderToStaticMarkup(createElement(AppOverviewPanel, {
    appId: "versy", installs: 0, windowLabel: "Last 7 days", trend: [], countries: [], plans: [], retention: [],
    userJourney: buildUserJourney(userJourneyDefinition("versy")!, []), yearlyPriceComparison: report,
  }));
  assert.ok(html.indexOf("Yearly prices") > html.indexOf("User journey"));
  for (const label of ["€39.99/year", "€44.99/year", "€49.99/year", "APPU lift", "Win %", "Refund rate", "Installed on v1.2.6+"]) assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, /Yearly prices · historical test|Yearly price · historical fixed/);
  assert.doesNotMatch(html, /Annual pricing test|\$29.99|\$17.99/);
  assert.match(renderToStaticMarkup(createElement(VersyYearlyPriceTable, { report: null })), /reporting is unavailable/);
});


test("retired seven-day history stays while all three-day assignments are excluded", () => {
  const retired = { yearly_price_experiment_id: VERSY_RETIRED_YEARLY_PRICE_EXPERIMENT, yearly_price_allocation: "25_25_25_25" };
  const attributes = new Map([
    ["old7", assignment(0, retired)], ["current7", assignment(0)],
    ["old3", assignment(0, { ...retired, yearly_price_product_id: `${VERSY_YEARLY_PRICES[0].productID}.trial3` })],
    ["wrong-allocation", assignment(0, { yearly_price_allocation: "25_25_25_25" })],
    ["impossible-current3", assignment(1, { yearly_price_product_id: `${VERSY_YEARLY_PRICES[1].productID}.trial3` })],
  ]);
  const report = buildVersyYearlyPriceComparison([...attributes.keys()].map((id) => install(id)),
    [event("old7"), event("old3", { netProceeds: 6 })], attributes, asOf);
  assert.deepEqual(report.rows.map((row) => row.installs), [2, 0]);
  assert.equal(report.rows[0].conversions!.global.proceeds, 12);
});


test("recovery cohorts keep overall outcomes without presenting main-offer trials as recovery trials", () => {
  const attributes = new Map([
    ["main-trial", currentAssignment(0, 0)],
    ["recovery-payer", currentAssignment(1, 0)],
    ["nonpayer", currentAssignment(2, 0)],
  ]);
  const report = buildVersyYearlyPriceComparison([...attributes.keys()].map((id) => install(id)), [
    event("main-trial", { productId: VERSY_CURRENT_YEARLY_PRICES[0].productID,
      periodType: "trial", netProceeds: 0, expiresAt: start + 8 * day }),
    event("recovery-payer", { productId: VERSY_RECOVERY_PRICES[0].productID }),
  ], attributes, asOf);
  const metric = report.recovery.rows[0].conversions!.global;
  assert.equal(metric.installs, 3);
  assert.equal(metric.trials, 1); // A real main-offer trial in the assigned cohort.
  assert.equal(metric.installPaid, 1); // The recovery purchase is immediately paid.
  assert.equal(metric.proceeds, 12);
  const html = renderToStaticMarkup(createElement(VersyYearlyPriceTable, { report }));
  const recovery = html.slice(html.indexOf("Recovery prices · A/B test"));
  const main = html.slice(html.indexOf("Yearly prices · A/B test"), html.indexOf("Recovery prices · A/B test"));
  assert.doesNotMatch(recovery, /Trial start|Trial → paid/);
  assert.match(recovery, /no trial · all offers/);
  assert.match(recovery, /Install → paid/);
  assert.match(recovery, /33\.3%/);
  assert.match(recovery, /\$4\.00/);
  assert.match(main, /Trial start/);
  assert.match(main, /Trial → paid/);
});


test("only the current price tests reset at the rollout boundary, including country slices", () => {
  const cutoff = Date.parse("2026-11-20T00:00:00Z");
  const at = cutoff + 2 * day;
  const attributes = new Map<string, Record<string, string>>([
    ["old", currentAssignment(0, 0, { yearly_price_assigned_at: String(cutoff - 1), recovery_price_assigned_at: String(cutoff - 1) })],
    ["old-install-new-assignment", currentAssignment(0, 0)],
    ["new-install-old-assignment", currentAssignment(0, 0, { yearly_price_assigned_at: String(cutoff - 1), recovery_price_assigned_at: String(cutoff - 1) })],
    ["duplicate-old-install", currentAssignment(0, 0)],
    ["boundary-payer", currentAssignment(0, 0)],
    ["boundary-nonpayer", currentAssignment(0, 0)],
    ["independent-cutoffs", currentAssignment(1, 1, { recovery_price_assigned_at: String(cutoff - 1) })],
    ["historical", assignment()], ["fixed", fixedAssignment()],
  ]);
  const older = new Set(["old", "old-install-new-assignment", "duplicate-old-install", "historical", "fixed"]);
  const installs = [...attributes.keys()].map((id) => ({ ...install(id),
    installedAt: older.has(id) ? cutoff - day : cutoff, country: "FR" }));
  installs.push({ ...install("duplicate-old-install"), installedAt: cutoff + 1, country: "FR" });
  const events = [...attributes.keys()].filter((id) => !["boundary-nonpayer", "independent-cutoffs"].includes(id)).map((id) => event(id));
  events.push(event("boundary-payer", { originalTransactionId: "pre-cutoff-chain", transactionId: "old", eventTs: cutoff - 1, netProceeds: 100 }));
  events.push(event("", { originalTransactionId: "pre-cutoff-chain", transactionId: "old-renewal", name: "renewal", eventTs: cutoff + day, netProceeds: 100 }));
  const report = buildVersyYearlyPriceComparison(installs, events, attributes, at);
  assert.deepEqual(report.current.rows.map((r) => r.installs), [2, 1, 0]);
  assert.deepEqual(report.recovery.rows.map((r) => r.installs), [2, 0]);
  for (const comparison of [report.current, report.recovery]) {
    const metric = comparison.rows[0].conversions!.global;
    assert.equal(metric.proceeds, 12);
    assert.equal(metric.installPaid, 1);
    assert.equal(metric.proceeds / metric.installs, 6);
  }
  assert.equal(report.rows[0].installs, 1);
  assert.equal(report.rows[0].conversions!.global.proceeds, 12);
  assert.equal(report.rollout.rows[0].installs, 1);
  assert.equal(report.rollout.rows[0].conversions!.global.proceeds, 12);
  const before = buildVersyYearlyPriceComparison(installs, events, attributes, cutoff - 1);
  assert.equal(before.current.status, "empty");
  assert.equal(before.recovery.status, "empty");
  const countries = buildAppCountryComparisons({ appId: "versy", asOf: at, journey: null, installs, events, attributes,
    countries: [{ country: "FR", proceeds: 12 }] });
  assert.deepEqual(countries.slices.FR.yearlyPriceComparison, report);
  const html = renderToStaticMarkup(createElement(VersyYearlyPriceTable, { report }));
  assert.equal((html.match(/dateTime="2026-11-20T00:00:00Z"/g) ?? []).length, 2);
  assert.equal((html.match(/Since 20 Nov 2026, 00:00 UTC/g) ?? []).length, 2);
  assert.doesNotMatch(html, /Yearly price · historical fixed|Yearly prices · historical test/);
});
