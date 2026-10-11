import assert from "node:assert/strict";
import test from "node:test";
import { acquisitionGroup, versionCohortConversions } from "../../lib/version-cohort-conversions";

const start = Date.parse("2026-09-01T00:00:00Z");
const day = 86_400_000;
const end = start + 7 * day;
const asOf = start + 20 * day;
function install(appUserId: string, appVersion = "1.2.1", installedAt = start) { return { appUserId, appVersion, installedAt }; }
function event(appUserId: string, overrides: Partial<Parameters<typeof versionCohortConversions>[1][number]> = {}) {
  return { appUserId, originalTransactionId: appUserId, transactionId: `${appUserId}-tx`, name: "initial_purchase", periodType: "normal",
    isRefund: false, netProceeds: 5, eventTs: start + day, attributionTs: start + day, expiresAt: 0, ...overrides };
}

test("classifies Meta and Apple Search Ads; no recorded attribution is non-ads", () => {
  assert.equal(acquisitionGroup({ acquisition_source: "meta" }), "ads");
  assert.equal(acquisitionGroup({ apple_search_ads_attribution: "true" }), "ads");
  assert.equal(acquisitionGroup({ acquisition_source: "meta", apple_search_ads_attribution: "false" }), "ads");
  assert.equal(acquisitionGroup({ apple_search_ads_attribution: "false" }), "nonAds");
  assert.equal(acquisitionGroup(undefined), "nonAds");
});

test("denominators include nonpayers, conversions stay with first version and follow outcomes after cohort end", () => {
  const report = versionCohortConversions([
    install("a"), install("b"), install("c"), install("d"),
    install("a", "1.2.2", start + 10 * day), install("outside", "1.2.1", end),
  ], [
    event("a", { periodType: "trial", netProceeds: 0, expiresAt: start + 8 * day }),
    event("a", { periodType: "trial", netProceeds: 0, expiresAt: start + 8 * day }),
    event("", { originalTransactionId: "a", transactionId: "renewal", name: "renewal", eventTs: start + 10 * day }),
    event("c"), event("outside"),
  ], new Map([["a", { acquisition_source: "meta" }], ["b", { acquisition_source: "meta" }]]), start, end, asOf);
  const version = report.get("1.2.1")!;
  assert.equal(report.has("1.2.2"), false);
  assert.deepEqual(version.global, { installs: 4, trials: 1, finishedTrials: 1, paid: 1, installPaid: 2, proceeds: 10, missingProceeds: false, missingInstallMoney: false, missingMoney: false });
  assert.deepEqual(version.ads, { installs: 2, trials: 1, finishedTrials: 1, paid: 1, installPaid: 1, proceeds: 5, missingProceeds: false, missingInstallMoney: false, missingMoney: false });
  assert.deepEqual(version.nonAds, { installs: 2, trials: 0, finishedTrials: 0, paid: 0, installPaid: 1, proceeds: 5, missingProceeds: false, missingInstallMoney: false, missingMoney: false });
});

test("deduplicates transaction revisions and refunds do not undo paid conversion", () => {
  const report = versionCohortConversions([install("a"), install("b")], [
    event("a", { transactionId: "trial-a", periodType: "trial", netProceeds: 0, eventTs: start, expiresAt: start + day }),
    event("b", { transactionId: "trial-b", periodType: "trial", netProceeds: 0, eventTs: start, expiresAt: start + day }),
    event("a", { netProceeds: null }), event("a", { attributionTs: start + 2 * day }),
    event("a", { name: "cancellation", isRefund: true, netProceeds: -5 }),
    event("a", { name: "renewal", transactionId: "renewal" }),
    event("b", { netProceeds: null }),
  ], new Map(), start, end, asOf).get("1.2.1")!;
  assert.equal(report.global.paid, 1);
  assert.equal(report.global.missingMoney, true);
  assert.equal(report.ads.missingMoney, false);
});

test("pre-install and future outcomes do not enter the cohort", () => {
  const report = versionCohortConversions([install("a", "1.2.1", start + day)], [
    event("a", { eventTs: start }), event("a", { originalTransactionId: "new", eventTs: asOf + day }),
  ], new Map(), start, end, asOf).get("1.2.1")!;
  assert.equal(report.global.paid, 0);
  assert.equal(report.global.trials, 0);
});


test("paid conversion only includes finished first trials and matching subsequent charges", () => {
  const users = ["finished", "cancelled", "active", "unknown", "direct", "unrelated"];
  const report = versionCohortConversions(users.map((user) => install(user)), [
    ...["finished", "cancelled", "unrelated"].map((user) => event(user, { periodType: "trial", netProceeds: 0, expiresAt: start + 8 * day })),
    event("active", { periodType: "trial", netProceeds: 0, expiresAt: asOf + day }),
    event("active", { name: "cancellation", eventTs: asOf - day, netProceeds: 0 }),
    event("unknown", { periodType: "trial", netProceeds: 0, expiresAt: 0 }),
    event("direct"),
    event("finished", { name: "renewal", transactionId: "paid", eventTs: start + 8 * day - 1000 }),
    event("cancelled", { name: "cancellation", netProceeds: 0 }),
    event("unrelated", { originalTransactionId: "other-subscription", eventTs: start + 9 * day }),
  ], new Map(), start, end, asOf).get("1.2.1")!.global;
  assert.equal(report.installs, 6);
  assert.equal(report.trials, 5);
  assert.equal(report.finishedTrials, 3);
  assert.equal(report.paid, 1);
});


test("install outcomes stay in their original version cohort and exclude unrelated users and old subscriptions", () => {
  const reports = versionCohortConversions([
    install("old", "1.0"), install("new", "2.0"), install("nonpayer", "2.0"),
    install("old", "2.0", start + 2 * day),
  ], [
    event("old", { periodType: "trial", netProceeds: 0, expiresAt: start + 8 * day }),
    event("", { originalTransactionId: "old", name: "renewal", transactionId: "renewal", eventTs: start + 10 * day }),
    event("new"), event("new"), event("outsider"),
    event("nonpayer", { eventTs: start - day }),
    event("nonpayer", { name: "renewal", transactionId: "old-renewal", eventTs: start + 3 * day }),
  ], new Map(), start, end, asOf);
  assert.equal(reports.get("1.0")!.global.trials, 1);
  assert.equal(reports.get("1.0")!.global.installPaid, 1);
  assert.equal(reports.get("2.0")!.global.installs, 2);
  assert.equal(reports.get("2.0")!.global.trials, 0);
  assert.equal(reports.get("2.0")!.global.installPaid, 1);
});


test("APPU includes nonpayers, corrected charges, refunds and post-update renewals in the original cohort", () => {
  const reports = versionCohortConversions([
    install("payer"), install("free"), install("payer", "2.0", start + 2 * day),
    install("missing", "3.0"), install("trial", "4.0"),
  ], [
    event("payer", { netProceeds: 10 }),
    event("payer", { netProceeds: 12, attributionTs: start + 2 * day }),
    event("", { originalTransactionId: "payer", name: "renewal", transactionId: "renewal", eventTs: start + 10 * day, netProceeds: 8 }),
    event("payer", { name: "cancellation", isRefund: true, netProceeds: -12 }),
    event("outsider", { netProceeds: 100 }),
    event("missing", { netProceeds: null }),
    event("trial", { periodType: "trial", netProceeds: null }),
  ], new Map([["payer", { acquisition_source: "meta" }]]), start, end, asOf);
  const report = reports.get("1.2.1")!;
  assert.equal(report.global.proceeds / report.global.installs, 4);
  assert.equal(report.ads.proceeds / report.ads.installs, 8);
  assert.equal(report.nonAds.proceeds / report.nonAds.installs, 0);
  assert.equal(report.global.missingProceeds, false);
  assert.equal(reports.has("2.0"), false);
  assert.equal(reports.get("3.0")!.global.missingProceeds, true);
  assert.equal(reports.get("4.0")!.global.missingProceeds, false);
  assert.equal(reports.get("4.0")!.global.proceeds, 0);
});
