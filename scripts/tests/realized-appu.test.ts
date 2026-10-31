import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { realizedAppuByUser, realizedAppuValue, versyMember } from "../../lib/realized-appu";
import { buildAppOverviewCohorts, overviewDailyPoints } from "../../lib/app-overview-cohorts";
import { buildAnalyticsMarkets } from "../../lib/analytics-markets";
import { versionCohortConversions } from "../../lib/version-cohort-conversions";
import { buildNativePaywallReport, type PaywallRecord, type PaywallRevenue } from "../../lib/native-paywall-analytics";
import RealizedAppu from "../../components/analytics/RealizedAppu";

const start = Date.parse("2026-10-01T00:00:00Z"), day = 86_400_000, asOf = start + 10 * day;
const annual = "com.arthurbuildsstuff.bible.yearly_4999";
type Event = Parameters<typeof versionCohortConversions>[1][number];
const event = (user: string, extra: Partial<Event> = {}): Event => ({ appUserId: user,
  productId: annual, originalTransactionId: user, transactionId: user, name: "initial_purchase",
  periodType: "trial", isRefund: false, netProceeds: 0, eventTs: start + day,
  attributionTs: start + day, expiresAt: start + 8 * day, ...extra });
const member = (appUserId: string, age = 0, trialDays = 7) => ({ appUserId, startedAt: start + age * day, trialDays });
const install = (appUserId: string, age = 0) => ({ appUserId, installedAt: start + age * day,
  appVersion: "1.2.6", language: "en", country: "US" });
const attributes = new Map([["paid", { versy_tracking_environment: "production", acquisition_source: "meta" }]]);

test("mature non-payers and cancelled trials stay in the denominator; recent users and open trials do not", () => {
  const events = [event("paid"), event("paid", { name: "renewal", transactionId: "paid2", periodType: "normal", netProceeds: 40, eventTs: start + 8 * day }),
    event("cancelled"), event("cancelled", { name: "cancellation", eventTs: start + 2 * day }),
    event("late", { eventTs: start + 7 * day, expiresAt: start + 14 * day }),
    event("early-charge", { expiresAt: asOf + day }),
    event("early-charge", { name: "renewal", transactionId: "early2", periodType: "normal", netProceeds: 40, eventTs: asOf - 1000 }),
  ];
  const result = realizedAppuByUser([member("paid"), member("free"), member("cancelled"), member("recent", 8), member("late"), member("early-charge")], events, asOf);
  assert.deepEqual([...result.keys()], ["paid", "free", "cancelled"]);
  assert.equal([...result.values()].reduce((sum, row) => sum + row.proceeds, 0), 40);
  assert.equal([...result.values()].reduce((sum, row) => sum + row.users, 0), 3);
});

test("three-day offers mature at their actual end; unknown expiry and a newly started second trial stay excluded", () => {
  const result = realizedAppuByUser([member("three", 6, 3), member("seven", 6), member("unknown"), member("second")], [
    event("three", { eventTs: start + 6 * day, expiresAt: start + 9 * day }),
    event("unknown", { expiresAt: NaN }), event("second"),
    event("second", { originalTransactionId: "second-chain", transactionId: "second-chain", eventTs: start + 9 * day, expiresAt: start + 12 * day }),
  ], asOf);
  assert.deepEqual([...result.keys()], ["three"]);
  const frozen = JSON.stringify({ schema: 1, environment: "production", expectedProduct: `${annual}.trial3` });
  assert.equal(versyMember(install("three"), { gp1_a_versy_onboarding_outcomes_v1: frozen,
    yearly_price_product_id: annual, yearly_price_assigned_at: String(start + 8 * day) }).trialDays, 3);
});

test("renewals and cancellation refunds follow anonymous chains and deduplicate; old chains and future money stay out", () => {
  const paid = event("paid", { name: "renewal", transactionId: "renewal", periodType: "normal", netProceeds: 40, eventTs: start + 8 * day });
  const result = realizedAppuByUser([member("paid"), member("upgraded", 2)], [event("paid"), paid, { ...paid, netProceeds: 39, attributionTs: asOf },
    event("", { originalTransactionId: "paid", transactionId: "renewal", name: "cancellation", isRefund: true, netProceeds: 9, eventTs: start + 9 * day }),
    event("upgraded"), event("upgraded", { name: "renewal", netProceeds: 100, periodType: "normal", eventTs: start + 9 * day }),
    { ...paid, transactionId: "future", netProceeds: 100, eventTs: asOf + 1 },
  ], asOf);
  assert.equal(result.get("paid")?.proceeds, 30);
  assert.equal(result.get("upgraded")?.proceeds, 0);
});

test("missing mature money is unavailable, while immature money does not suppress mature APPU", () => {
  const result = realizedAppuByUser([member("paid"), member("young", 8)], [
    event("paid", { periodType: "normal", netProceeds: null }),
    event("young", { eventTs: start + 9 * day, periodType: "normal", netProceeds: null }),
  ], asOf);
  assert.equal(realizedAppuValue(result.get("paid")), null);
  assert.equal(result.has("young"), false);
  assert.equal(realizedAppuValue({ users: 0, proceeds: 0, missingMoney: false }), null);
});

test("overview, daily totals, country/language and acquisition slices aggregate mature users without changing existing metrics", () => {
  const installs = [install("paid"), install("free"), { ...install("young", 8), country: "BR", language: "pt" }];
  const events = [event("paid"), event("paid", { name: "renewal", transactionId: "r", periodType: "normal", netProceeds: 40, eventTs: start + 8 * day })];
  const input = { period: "month" as const, startMs: start, endMs: asOf + 1, installs, events, attributes, asOf, downloads: [] };
  const report = buildAppOverviewCohorts(input);
  assert.equal(report.total.installs, 3);
  assert.equal(report.total.paid, 1);
  assert.equal(report.total.proceeds, 40);
  assert.deepEqual(report.total.realizedAppu, { users: 2, proceeds: 40, missingMoney: false });
  assert.equal(realizedAppuValue(overviewDailyPoints(report)[0].dailyTotal.realizedAppu), 20);
  const markets = buildAnalyticsMarkets(input);
  assert.equal(realizedAppuValue(markets.slices["en:US"].overview.total.realizedAppu), 20);
  assert.equal(realizedAppuValue(markets.slices["pt:BR"].overview.total.realizedAppu), null);
  assert.equal(realizedAppuValue(markets.slices["all:all"].conversions.metaAds.realizedAppu), 40);
  assert.equal(realizedAppuValue(markets.slices["all:all"].conversions.nonAds.realizedAppu), 0);
});

test("native paywalls use verified trial expiry and retain original placement proceeds", () => {
  const experiment = "versy_onboarding_outcomes_v1";
  const a: PaywallRecord = { schema: 1, environment: "production", experiment, experimentName: "Onboarding", variant: "scroll", variantName: "Scroll",
    paywall: "scroll", language: "en", assignedAt: start, randomized: false, variantCount: 1, expectedProduct: annual };
  const context = { ...a, placement: "onboarding_scroll_bible", reachedAt: start + 1000, viewedAt: start + 2000 };
  const attr = (appUserId: string, key: string, value: unknown) => ({ appUserId, key, value: JSON.stringify(value) });
  const attrs = [attr("paid", `gp1_a_${experiment}`, a), attr("free", `gp1_a_${experiment}`, a),
    attr("paid", `gp1_p_${experiment}__onboarding_scroll_bible`, context), attr("paid", "gp1_t_100", {
      context, productID: annual, transactionID: "100", originalTransactionID: "100", startedAt: start + day, purchasedAt: start + day })];
  const iso = (at: number) => new Date(at).toISOString();
  const initial: PaywallRevenue = { id: "100", name: "initial_purchase", originalTransactionId: "100", transactionId: "100", productId: annual,
    periodType: "TRIAL", expirationAt: iso(asOf + day), isRefund: 0, price: 0, proceeds: 0, ts: iso(start + day), purchasedAt: iso(start + day), attributionTs: iso(start + day) };
  const renewal = { ...initial, id: "101", transactionId: "101", name: "renewal", periodType: "normal", price: 50, proceeds: 40, ts: iso(asOf - 1000), purchasedAt: iso(asOf - 1000) };
  const rowAt = (now: number) => buildNativePaywallReport(attrs, [initial, renewal], start, asOf, now).groups.find((g) => g.language === "all")!;
  assert.equal(rowAt(asOf).paywalls[0].paid, 1);
  assert.equal(rowAt(asOf).paywalls[0].proceeds, 40);
  assert.deepEqual(rowAt(asOf).paywalls[0].realizedAppu, { users: 1, proceeds: 0, missingMoney: false });
  assert.deepEqual(rowAt(asOf + day).paywalls[0].realizedAppu, { users: 2, proceeds: 40, missingMoney: false });
  assert.equal(realizedAppuValue(rowAt(asOf + day).placements[0].realizedAppu), 40);
});

test("parentheses show realized APPU and distinguish no mature users from mature users earning zero", () => {
  assert.match(renderToStaticMarkup(createElement(RealizedAppu, { metric: { users: 2, proceeds: 1.36, missingMoney: false } })), /\(\$0.68 realized\)/);
  assert.match(renderToStaticMarkup(createElement(RealizedAppu, { metric: { users: 0, proceeds: 0, missingMoney: false } })), /\(— realized\)/);
  assert.match(renderToStaticMarkup(createElement(RealizedAppu, { metric: { users: 2, proceeds: 0, missingMoney: false } })), /\(\$0.00 realized\)/);
  assert.equal(renderToStaticMarkup(createElement(RealizedAppu, {})), "");
});
