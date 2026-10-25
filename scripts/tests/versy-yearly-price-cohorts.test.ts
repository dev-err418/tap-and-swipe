import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppOverviewPanel from "../../components/analytics/AppOverviewPanel";
import VersyYearlyPriceTable from "../../components/analytics/VersyYearlyPriceTable";
import { buildVersyYearlyPriceComparison, VERSY_YEARLY_PRICE_EXPERIMENT, VERSY_PREVIOUS_YEARLY_PRICE_EXPERIMENT, VERSY_YEARLY_PRICES } from "../../lib/versy-yearly-price-cohorts";
import { buildUserJourney, userJourneyDefinition } from "../../lib/user-journey";

const day = 86_400_000, start = Date.parse("2026-10-01T00:00:00Z"), asOf = start + 20 * day;
const install = (appUserId: string, appVersion = "1.2.6") => ({ appUserId, appVersion, installedAt: start });
const assignment = (price = 0, extra = {}) => ({
  versy_tracking_environment: "production", yearly_price_experiment_id: VERSY_YEARLY_PRICE_EXPERIMENT,
  yearly_price_product_id: VERSY_YEARLY_PRICES[price].productID, yearly_price_allocation: "25_25_25_25",
  yearly_price_assigned_at: String(start - 1000), ...extra,
});
type Event = Parameters<typeof buildVersyYearlyPriceComparison>[1][number];
const event = (appUserId: string, extra: Partial<Event> = {}): Event => ({ appUserId, originalTransactionId: appUserId,
  transactionId: appUserId, name: "initial_purchase", periodType: "normal", netProceeds: 12, isRefund: false,
  eventTs: start + day, attributionTs: start + day, expiresAt: 0, ...extra });

test("the two saved price assignments retain nonpayers, trials, weekly purchases, renewals and refunds", () => {
  const attributes = new Map([["payer", assignment()], ["free", assignment()], ["weekly", assignment(1)]]);
  const renewal = event("", { originalTransactionId: "payer", name: "renewal", transactionId: "renewal", netProceeds: 8, eventTs: start + 10 * day });
  const report = buildVersyYearlyPriceComparison([install("payer"), install("free"), install("weekly")], [
    event("payer", { periodType: "trial", netProceeds: 0, expiresAt: start + 8 * day }),
    renewal, renewal, event("payer", { name: "cancellation", transactionId: "renewal", isRefund: true, netProceeds: -2, eventTs: start + 11 * day }),
    event("weekly"), event("outsider"),
  ], attributes, asOf);
  assert.equal(report.status, "ready");
  assert.deepEqual(report.rows.map((row) => row.installs), [2, 1, 0, 0]);
  const first = report.rows[0].conversions!.global;
  assert.equal(first.proceeds / first.installs, 3);
  assert.equal(first.proceedsVariance, 18);
  assert.equal(first.trials, 1);
  assert.equal(first.paid, 1);
  assert.equal(first.purchases, 1);
  assert.equal(first.refunds, 1);
  assert.equal(report.rows[1].conversions!.global.proceeds, 12);
  assert.deepEqual(Object.values(report.labels), ["$39.99/year (7d)", "$49.99/year (7d)", "$39.99/year (3d)", "$49.99/year (3d)"]);
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
  assert.deepEqual(report.rows.map((row) => row.installs), [1, 0, 0, 0]);
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

test("Versy shows the compact two-price table below User journey without restoring the removed banner", () => {
  const report = buildVersyYearlyPriceComparison([], [], new Map(), asOf);
  const html = renderToStaticMarkup(createElement(AppOverviewPanel, {
    appId: "versy", installs: 0, windowLabel: "Last 7 days", trend: [], countries: [], plans: [], retention: [],
    userJourney: buildUserJourney(userJourneyDefinition("versy")!, []), yearlyPriceComparison: report,
  }));
  assert.ok(html.indexOf("Yearly prices") > html.indexOf("User journey"));
  for (const label of ["$39.99/year", "$49.99/year", "APPU lift", "Win %", "Refund rate", "Installed on v1.2.6+"]) assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, /Annual pricing test|\$29.99|\$17.99/);
  assert.match(renderToStaticMarkup(createElement(VersyYearlyPriceTable, { report: null })), /reporting is unavailable/);
});


test("matching seven-day history stays in its row beside the new trial lengths", () => {
  const attributes = new Map([
    ["old", assignment(0, { yearly_price_experiment_id: VERSY_PREVIOUS_YEARLY_PRICE_EXPERIMENT, yearly_price_allocation: "50_50" })],
    ["new7", assignment(0)], ["new3", assignment(2)],
    ["wrong-allocation", assignment(2, { yearly_price_allocation: "50_50" })],
    ["impossible-old3", assignment(2, { yearly_price_experiment_id: VERSY_PREVIOUS_YEARLY_PRICE_EXPERIMENT, yearly_price_allocation: "50_50" })],
  ]);
  const report = buildVersyYearlyPriceComparison([...attributes.keys()].map((id) => install(id)),
    [event("old"), event("new3", { netProceeds: 6 })], attributes, asOf);
  assert.deepEqual(report.rows.map((row) => row.installs), [2, 0, 1, 0]);
  assert.equal(report.rows[0].conversions!.global.proceeds, 12);
  assert.equal(report.rows[2].conversions!.global.proceeds, 6);
});
