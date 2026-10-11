import assert from "node:assert/strict";
import test from "node:test";
import { buildAnalyticsMarkets, DEFAULT_APP_LANGUAGE, marketLanguage, marketCountry } from "../../lib/analytics-markets";
const start = Date.parse("2026-10-01T00:00:00Z"), day = 86400000;
const install = (appUserId: string, language: string, country: string, installedAt = start) => ({ appUserId, language, country, installedAt, appVersion: "1.0" });
const event = (appUserId: string, overrides = {}) => ({ appUserId, name: "initial_purchase", originalTransactionId: appUserId, transactionId: appUserId, periodType: "normal", netProceeds: 10, isRefund: false, eventTs: start + day, attributionTs: start + day, expiresAt: 0, ...overrides });
test("app language defaults and locale normalization keep country independent", () => {
  assert.deepEqual(DEFAULT_APP_LANGUAGE, { poky: "es", glow: "en", versy: "pt" });
  assert.equal(marketLanguage("es-MX"), "es");
  assert.equal(marketLanguage("pt_BR"), "pt");
  assert.equal(marketLanguage(""), "unknown");
  assert.equal(marketCountry("mx"), "MX");
  assert.equal(marketCountry(""), "unknown");
});
test("market intersections freeze first metadata and retain anonymous renewals in the install cohort", () => {
  const report = buildAnalyticsMarkets({ period: "month", startMs: start, endMs: start + 3 * day, asOf: start + 10 * day, downloads: [],
    installs: [install("a", "es-MX", "MX"), install("b", "es", "US"), install("c", "en", "MX"), install("d", "", "MX"),
      install("a", "en", "US", start + 2 * day), install("outside", "es", "MX", start - day)],
    events: [event("a"), event("outside"), event("", { name: "renewal", originalTransactionId: "a", transactionId: "renewal", eventTs: start + 5 * day })],
    attributes: new Map([["a", { acquisition_source: "meta" }]]) });
  assert.equal(report.slices["all:all"].conversions.global.installs, 4);
  assert.equal(report.slices["es:all"].conversions.global.installs, 2);
  assert.equal(report.slices["es:MX"].conversions.global.installs, 1);
  assert.equal(report.slices["es:MX"].conversions.global.proceeds, 20);
  assert.equal(report.slices["es:MX"].overview.total.proceeds, 20);
  assert.equal(report.slices["es:MX"].versions[0].conversions?.ads.installPaid, 1);
  assert.equal(report.slices["es:US"].conversions.global.proceeds, 0);
  assert.equal(report.slices["all:MX"].conversions.global.installs, 3);
  assert.equal(report.slices["unknown:MX"].conversions.global.installs, 1);
  assert.equal(report.slices["en:US"], undefined);
  assert.doesNotMatch(JSON.stringify(report), /appUserId|originalTransactionId/);
});
