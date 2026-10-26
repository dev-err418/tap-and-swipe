import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import GlowPaywallCohortTables from "../../components/analytics/GlowPaywallCohortTables";
import { buildGlowPaywallCohortComparisons, GLOW_PAYWALL_COHORT_KEYS } from "../../lib/glow-paywall-cohort-comparisons";
import { GLOW_PAYWALL_FLOW_LEGACY_ID, GLOW_PAYWALL_FLOW_LEGACY_KEY, GLOW_PAYWALL_FLOW_ALLOCATION, GLOW_PAYWALL_FLOW_ID, GLOW_PAYWALL_FLOW_KEY } from "../../lib/glow-onboarding-experience";

const day = 86_400_000, start = Date.parse("2026-10-01T00:00:00Z"), end = start + 7 * day, asOf = start + 20 * day;
const priceKey = "gp1_a_native_yearly_prices_v4";
const install = (appUserId: string, installedAt = start) => ({ appUserId, installedAt, appVersion: "1.8.3" });
const flow = (variant = "standard", assignedAt = start + day, extra = {}) => JSON.stringify({
  schema: 1, experiment: GLOW_PAYWALL_FLOW_ID, allocation: GLOW_PAYWALL_FLOW_ALLOCATION, environment: "production", randomized: true,
  language: "en", variant, assignedAt, updatedAt: assignedAt, ...extra,
});
const price = (variant = "yr_34", assignedAt = start + day, extra = {}) => JSON.stringify({
  schema: 1, experiment: "native_yearly_prices_v4", experimentName: "Yearly prices", variant, variantName: variant,
  paywall: variant, language: "en", expectedProduct: "yearly", assignedAt, randomized: true,
  variantCount: 3, environment: "production", ...extra,
});
type Event = Parameters<typeof buildGlowPaywallCohortComparisons>[1][number];
const event = (appUserId: string, overrides: Partial<Event> = {}): Event => ({
  appUserId, originalTransactionId: appUserId, transactionId: appUserId, name: "initial_purchase", periodType: "normal",
  isRefund: false, netProceeds: 10, eventTs: start + 2 * day, attributionTs: start + 2 * day, expiresAt: 0, ...overrides,
});

test("flow and price comparisons independently retain nonpayers and follow later purchases and refunds", () => {
  const attributes = new Map<string, Record<string, string>>([
    ["payer", { [GLOW_PAYWALL_FLOW_KEY]: flow(), [priceKey]: price() }],
    ["free", { [GLOW_PAYWALL_FLOW_KEY]: flow(), [priceKey]: price("yr_49") }],
    ["direct", { [GLOW_PAYWALL_FLOW_KEY]: flow("versy_reminder"), [priceKey]: price("yr_59") }],
  ]);
  const renewal = event("", { originalTransactionId: "payer", transactionId: "renewal", name: "renewal", eventTs: end + day });
  const refund = event("payer", { transactionId: "renewal", name: "cancellation", isRefund: true, netProceeds: -4, eventTs: end + 2 * day });
  const report = buildGlowPaywallCohortComparisons([install("payer"), install("free"), install("direct")], [
    event("payer", { periodType: "trial", netProceeds: 0, expiresAt: end + day }),
    renewal, renewal, refund, refund, event("direct"),
  ], attributes, start, end, asOf);
  const standard = report.flows.rows[0].conversions!.global;
  assert.equal(standard.installs, 2);
  assert.equal(standard.proceeds / standard.installs, 3);
  assert.equal(standard.trials, 1);
  assert.equal(standard.finishedTrials, 1);
  assert.equal(standard.paid, 1);
  assert.equal(standard.purchases, 1);
  assert.equal(standard.refunds, 1);
  assert.equal(report.flows.rows[2].conversions!.global.installPaid, 1);
  assert.deepEqual(report.prices.rows.map((row) => row.conversions!.global.installs), [1, 1, 1, 0, 0, 0]);
  assert.equal(report.prices.rows[0].conversions!.global.proceeds, 6);
  assert.deepEqual(report.flowPrices.rows.map((row) => row.installs), [1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]);
  assert.equal(report.flowPrices.rows[0].conversions!.global.proceeds, 6);
  assert.equal(report.flowPrices.rows[0].conversions!.global.refunds, 1);
  assert.equal(report.flowPrices.rows[8].conversions!.global.installPaid, 1);
  assert.deepEqual(GLOW_PAYWALL_COHORT_KEYS, [GLOW_PAYWALL_FLOW_KEY, GLOW_PAYWALL_FLOW_LEGACY_KEY, priceKey, "gp1_a_native_yearly_prices_v5"]);
  const html = renderToStaticMarkup(createElement(GlowPaywallCohortTables, { report, windowLabel: "Last 7 days" }));
  for (const label of ["Paywall flows", "Yearly prices", "Paywall flow × yearly price", "Current flow", "Versy reminder flow", "$34.99/year", "$49.99/year", "$59.99/year", "APPU", "Refund rate"]) assert.ok(html.includes(label), label);
  for (const label of ["Meta Ads", "See graph", ">Refunds</th>"]) assert.ok(!html.includes(label), label);
});

test("joint cohorts require both assignments and only count outcomes after the later assignment", () => {
  const attrs = new Map<string, Record<string, string>>([
    ["both", { [GLOW_PAYWALL_FLOW_KEY]: flow(), [priceKey]: price("yr_34", start + 3 * day) }],
    ["flow-only", { [GLOW_PAYWALL_FLOW_KEY]: flow() }],
    ["price-only", { [priceKey]: price() }],
  ]);
  const report = buildGlowPaywallCohortComparisons([...attrs.keys()].map((id) => install(id)), [
    event("both"),
    event("both", { originalTransactionId: "later", transactionId: "later", eventTs: start + 4 * day, netProceeds: 6 }),
    event("flow-only"), event("price-only"),
  ], attrs, start, end, asOf);
  assert.equal(report.flows.rows[0].installs, 2);
  assert.equal(report.prices.rows[0].installs, 2);
  assert.equal(report.flowPrices.rows.reduce((sum, row) => sum + row.installs, 0), 1);
  const joint = report.flowPrices.rows[0].conversions!.global;
  assert.equal(joint.proceeds, 6);
  assert.equal(joint.purchases, 1);
});

test("date picker selects first installs, not assignments, and excludes pre-assignment subscriptions", () => {
  const attrs = new Map([
    ["late", { [GLOW_PAYWALL_FLOW_KEY]: flow("standard", end + day), [priceKey]: price("yr_34", end + day) }],
    ["old", { [GLOW_PAYWALL_FLOW_KEY]: flow(), [priceKey]: price() }],
    ["before", { [GLOW_PAYWALL_FLOW_KEY]: flow(), [priceKey]: price() }],
  ]);
  const report = buildGlowPaywallCohortComparisons([
    install("late"), install("old", start - day), install("old"), install("before"),
  ], [
    event("late", { eventTs: end + 2 * day }),
    event("before", { eventTs: start, periodType: "trial", netProceeds: 0, expiresAt: start + 3 * day }),
    event("before", { transactionId: "renewal", name: "renewal", eventTs: end + day }),
    event("old"),
  ], attrs, start, end, asOf);
  const row = report.flows.rows[0].conversions!.global;
  assert.equal(row.installs, 2);
  assert.equal(row.proceeds, 10);
  assert.equal(row.trials, 0);
  assert.equal(row.installPaid, 1);
  assert.equal(report.prices.rows[0].conversions!.global.proceeds, 10);
});

test("startup price assignments before the SDK install timestamp still include every assigned install", () => {
  const attrs = new Map([["startup", { [GLOW_PAYWALL_FLOW_KEY]: flow("standard", start - 250), [priceKey]: price("yr_34", start - 250) }]]);
  const report = buildGlowPaywallCohortComparisons([install("startup")], [event("startup")], attrs, start, end, asOf);
  for (const comparison of [report.flows, report.prices]) {
    assert.equal(comparison.rows[0].installs, 1);
    assert.equal(comparison.rows[0].conversions!.global.proceeds, 10);
  }
});

test("only valid current randomized production assignments enter, with missing money kept unavailable", () => {
  const attrs = new Map<string, Record<string, string>>([
    ["valid", { [GLOW_PAYWALL_FLOW_KEY]: flow(), [priceKey]: price() }],
    ["debug", { [GLOW_PAYWALL_FLOW_KEY]: flow("standard", start + day, { environment: "development" }), [priceKey]: price("yr_34", start + day, { environment: "development" }) }],
    ["forced", { [GLOW_PAYWALL_FLOW_KEY]: flow("standard", start + day, { randomized: false }), [priceKey]: price("yr_34", start + day, { randomized: false }) }],
    ["future", { [GLOW_PAYWALL_FLOW_KEY]: flow("standard", asOf + 1), [priceKey]: price("yr_34", asOf + 1) }],
    ["old", { [GLOW_PAYWALL_FLOW_KEY]: flow("standard", start + day, { experiment: "old_flow" }), [priceKey]: price("yr_34", start + day, { experiment: "native_paywalls_v3" }) }],
    ["broken", { [GLOW_PAYWALL_FLOW_KEY]: "not json", [priceKey]: "not json" }],
  ]);
  const report = buildGlowPaywallCohortComparisons([...attrs.keys()].map((id) => install(id)), [event("valid", { netProceeds: null })], attrs, start, end, asOf);
  for (const comparison of [report.flows, report.prices]) {
    assert.equal(comparison.rows.reduce((sum, row) => sum + row.installs, 0), 1);
    assert.equal(comparison.rows[0].conversions!.global.missingProceeds, true);
    assert.equal(comparison.rows[0].conversions!.global.missingInstallMoney, true);
    assert.ok(comparison.warnings.length > 0);
  }
  const unavailable = renderToStaticMarkup(createElement(GlowPaywallCohortTables, { report: null, windowLabel: "Today" }));
  assert.ok(unavailable.includes("reporting is unavailable"));
});


test("six price/trial rows preserve seven-day history and never double-count an upgrade", () => {
  const currentKey = "gp1_a_native_yearly_prices_v5";
  const current = (variant: string) => price(variant, start + day, { experiment: "native_yearly_prices_v5", variantCount: 6 });
  const attributes = new Map<string, Record<string, string>>([
    ["old", { [priceKey]: price(), [currentKey]: current("yr_49_3d") }],
    ["new7", { [currentKey]: current("yr_34") }],
    ["new3", { [currentKey]: current("yr_34_3d") }],
    ["invalid", { [priceKey]: price("yr_34_3d") }],
  ]);
  const report = buildGlowPaywallCohortComparisons([...attributes.keys()].map((id) => install(id)),
    [event("old"), event("new3", { netProceeds: 6 })], attributes, start, end, asOf);
  assert.deepEqual(report.prices.rows.map((row) => row.installs), [2, 0, 0, 1, 0, 0]);
  assert.equal(report.prices.rows[0].conversions!.global.proceeds, 10);
  assert.equal(report.prices.rows[3].conversions!.global.proceeds, 6);
});

test("note flows share base-flow price intersections while the old split remains historical", () => {
  const attrs = new Map<string, Record<string, string>>([
    ["current-note", { [GLOW_PAYWALL_FLOW_KEY]: flow("standard_note"), [priceKey]: price() }],
    ["reminder-note", { [GLOW_PAYWALL_FLOW_KEY]: flow("versy_reminder_note"), [priceKey]: price("yr_59") }],
    ["old", { [GLOW_PAYWALL_FLOW_LEGACY_KEY]: flow("standard", start + day,
      { experiment: GLOW_PAYWALL_FLOW_LEGACY_ID, allocation: "50_50" }), [priceKey]: price() }],
  ]);
  const report = buildGlowPaywallCohortComparisons([...attrs.keys()].map((id) => install(id)),
    [event("reminder-note"), event("old")], attrs, start, end, asOf);
  assert.deepEqual(report.flows.rows.map((r) => r.installs), [0, 1, 0, 1]);
  assert.equal(report.flowPrices.rows.find((r) => r.version === "standard|yr_34")?.installs, 1);
  assert.equal(report.flowPrices.rows.find((r) => r.version === "versy_reminder|yr_59")?.conversions?.global.proceeds, 10);
  assert.equal(report.historicalFlows?.rows[0].installs, 1);
  assert.equal(report.historicalFlows?.rows[0].conversions?.global.proceeds, 10);
  const html = renderToStaticMarkup(createElement(GlowPaywallCohortTables, { report, windowLabel: "All time" }));
  assert.match(html, /Current flow \+ note/);
  assert.match(html, /Versy reminder flow \+ note/);
  assert.match(html, /Previous 50\/50 paywall-flow experiment/);
});

test("joint base-flow rows pool note and control users without averaging rates or mixing trial lengths", () => {
  const attrs = new Map<string, Record<string, string>>([
    ["current-paid", { [GLOW_PAYWALL_FLOW_KEY]: flow(), [priceKey]: price() }],
    ["note-paid", { [GLOW_PAYWALL_FLOW_KEY]: flow("standard_note"), [priceKey]: price() }],
    ["note-free-1", { [GLOW_PAYWALL_FLOW_KEY]: flow("standard_note"), [priceKey]: price() }],
    ["note-free-2", { [GLOW_PAYWALL_FLOW_KEY]: flow("standard_note"), [priceKey]: price() }],
    ["reminder-paid", { [GLOW_PAYWALL_FLOW_KEY]: flow("versy_reminder"), [priceKey]: price() }],
    ["reminder-note-free", { [GLOW_PAYWALL_FLOW_KEY]: flow("versy_reminder_note"), [priceKey]: price() }],
    ["short-trial-note", { [GLOW_PAYWALL_FLOW_KEY]: flow("standard_note"),
      gp1_a_native_yearly_prices_v5: price("yr_34_3d", start + day, { experiment: "native_yearly_prices_v5", variantCount: 6 }) }],
  ]);
  const notePurchase = event("note-paid", { netProceeds: 30 });
  const noteRefund = event("note-paid", { name: "cancellation", isRefund: true, netProceeds: -5, eventTs: end + day });
  const report = buildGlowPaywallCohortComparisons([...attrs.keys(), "note-paid"].map((id) => install(id)), [
    event("current-paid"), notePurchase, notePurchase, noteRefund, noteRefund,
    event("reminder-paid", { netProceeds: 12 }), event("short-trial-note", { netProceeds: 7 }),
  ], attrs, start, end, asOf);
  assert.equal(report.flowPrices.rows.length, 12);
  assert.ok(report.flowPrices.rows.every((row) => !row.version.includes("_note")));
  const current = report.flowPrices.rows.find((row) => row.version === "standard|yr_34")!.conversions!.global;
  assert.equal(current.installs, 4);
  assert.equal(current.installPaid, 2);
  assert.equal(current.proceeds, 35);
  assert.equal(current.proceeds / current.installs, 8.75);
  assert.equal(current.refunds, 1);
  const reminder = report.flowPrices.rows.find((row) => row.version === "versy_reminder|yr_34")!.conversions!.global;
  assert.equal(reminder.installs, 2);
  assert.equal(reminder.proceeds, 12);
  assert.equal(reminder.installPaid, 1);
  const shortTrial = report.flowPrices.rows.find((row) => row.version === "standard|yr_34_3d")!;
  assert.equal(shortTrial.installs, 1);
  assert.equal(shortTrial.conversions!.global.proceeds, 7);
  assert.deepEqual(report.flows.rows.map((row) => row.installs), [1, 4, 1, 1]);
  assert.equal(report.flowPrices.rows.reduce((sum, row) => sum + row.installs, 0), 7);
  const html = renderToStaticMarkup(createElement(GlowPaywallCohortTables, { report, windowLabel: "All time" }));
  assert.match(html, /Note and no-note variants are combined within each flow/);
});
