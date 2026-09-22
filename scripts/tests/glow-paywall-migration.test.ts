import assert from "node:assert/strict";
import test from "node:test";
import { glowPaywallEngine, glowPaywallMigrationExperiment, GLOW_SUPERWALL_HISTORY_START_MS } from "../../lib/glow-paywall-migration";
import { GLOW_EXPERIMENT_START_MS } from "../../lib/glow-experiment-window";

const DAY = 86_400_000;
const start = GLOW_EXPERIMENT_START_MS;
const install = (appUserId: string, day = 0, appVersion = "1.6.9", country = "GB") => ({ appUserId, installedAt: start + day * DAY, appVersion, country });
const event = (appUserId: string, day: number, netProceeds: number, overrides = {}) => ({
  appUserId, eventTs: start + day * DAY, attributionTs: start + day * DAY,
  originalTransactionId: appUserId, transactionId: `${appUserId}-${day}`, name: "initial_purchase",
  periodType: "normal", isTrialConversion: false, netProceeds, ...overrides,
});

test("30-day legacy history restores pre-cutoff installs and outcomes without expanding native cohorts", () => {
  assert.equal(GLOW_SUPERWALL_HISTORY_START_MS, start - 30 * DAY);
  const report = glowPaywallMigrationExperiment({ startMs: start, endMs: start + DAY, installs: [
    install("old-payer", -20), install("old-free", -30), install("too-old", -30 - 1 / DAY),
    install("early-native", -1, "1.7.0"), install("native", 0, "1.7.0"), install("after-end", 1),
  ], events: [
    event("old-payer", -19, 0, { periodType: "trial" }),
    event("old-payer", -16, 20, { name: "renewal", isTrialConversion: true }),
    event("old-payer", 2, 10, { name: "renewal" }),
    event("native", 1, 15), event("early-native", 0, 100), event("too-old", 0, 100),
  ] }, start + 4 * DAY);
  const [legacy, native] = report.variants;
  assert.equal(legacy.installs, 2);
  assert.equal(legacy.proceeds, 30);
  assert.equal(legacy.paid, 1);
  assert.equal(legacy.trials, 1);
  assert.equal(legacy.converted, 1);
  assert.equal(legacy.countries.GB.proceeds, 30);
  assert.equal(native.installs, 1);
  assert.equal(native.proceeds, 15);
  assert.equal(report.randomized, false);
});

test("renewals, refunds and delivery revisions count once; paying users stay unique across subscriptions", () => {
  const charge = event("old", -10, 20);
  const report = glowPaywallMigrationExperiment({ startMs: start, endMs: start + DAY, installs: [install("old", -20)], events: [
    charge, { ...charge, attributionTs: charge.attributionTs + 1, netProceeds: 18 },
    event("old", 1, -18, { name: "cancellation", transactionId: charge.transactionId }),
    event("old", 2, 10, { originalTransactionId: "another-subscription" }),
    event("old", 3, 10, { name: "cancellation" }),
    event("old", 99, 100), event("old", -21, 100), event("unrelated", 1, 100),
  ] }, start + 4 * DAY);
  assert.equal(report.variants[0].proceeds, 10);
  assert.equal(report.variants[0].paid, 1);
});

test("earliest install owns version and country; recent period selectors retain the historical baseline", () => {
  const report = glowPaywallMigrationExperiment({ startMs: start + DAY, endMs: start + 2 * DAY, installs: [
    install("upgraded", -20, "1.6.9", "ES"), install("upgraded", 1, "1.7.1", "US"),
    install("outside-native", 0, "1.7.0"), install("current-native", 1, "1.7.0"), install("unknown", 1, ""),
  ], events: [event("upgraded", 2, 10)] }, start + 4 * DAY);
  assert.equal(report.variants[0].installs, 1);
  assert.equal(report.variants[0].countries.ES.proceeds, 10);
  assert.equal(report.variants[0].countries.US, undefined);
  assert.equal(report.variants[1].installs, 1);
});

test("only valid versions are classified at the native 1.7.0 boundary", () => {
  for (const version of ["1.7", "1.7.0", "1.7.10", "2.0.0", "1.7.0+1"]) assert.equal(glowPaywallEngine(version), "native");
  for (const version of ["1.6.9", "1.0", "0.9.0"]) assert.equal(glowPaywallEngine(version), "legacy");
  for (const version of ["", "unknown", "1.6.error"]) assert.equal(glowPaywallEngine(version), null);
});
