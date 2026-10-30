import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { versionCohortConversions } from "../../lib/version-cohort-conversions";
import { buildAppOverviewCohorts, overviewDailyPoints } from "../../lib/app-overview-cohorts";
import { buildAnalyticsMarkets } from "../../lib/analytics-markets";
import { createOfferAccumulator, offerProductResolver, versyOfferRows, type WithOfferBreakdown } from "../../lib/versy-offer-breakdown";
import VersyOfferBreakdown from "../../components/analytics/VersyOfferBreakdown";
import { buildNativePaywallReport, type PaywallRecord, type PaywallRevenue } from "../../lib/native-paywall-analytics";

const start = Date.parse("2026-10-01T00:00:00Z"), day = 86_400_000, asOf = start + 20 * day;
const prefix = "com.arthurbuildsstuff.bible.";
const products = ["yearly_3999_80", "yearly_4999", "Weekly", "YearlyDiscount"].map((sku) => prefix + sku);
const installs = ["39", "49", "weekly", "recovery", "free", "trial"].map((appUserId, index) => ({
  appUserId, appVersion: "1.3.0", installedAt: start + index * 3_600_000,
  country: index % 2 ? "BR" : "US", language: index % 2 ? "pt" : "en",
}));
type Event = Parameters<typeof versionCohortConversions>[1][number];
const charge = (user: string, productId: string, netProceeds: number | null, extra: Partial<Event> = {}): Event => ({
  appUserId: user, productId, netProceeds, originalTransactionId: user, transactionId: user,
  name: "initial_purchase", isRefund: false, periodType: "normal", eventTs: start + day,
  attributionTs: start + day, expiresAt: start + 8 * day, ...extra,
});
const events = [
  charge("39", products[0], 30), charge("49", products[1], 40), charge("weekly", products[2], 3), charge("recovery", products[3], 12),
  charge("trial", products[1], 0, { periodType: "trial" }),
  charge("", "", 3, { originalTransactionId: "weekly", transactionId: "w2", name: "renewal", eventTs: start + 8 * day }),
  charge("", "", -3, { originalTransactionId: "weekly", transactionId: "w2", name: "cancellation", isRefund: true, eventTs: start + 9 * day }),
];

test("offer contributions reconcile with cohort APPU, including nonpayers, duplicate deliveries and refunded renewals", () => {
  const revised = charge("39", products[0], 29, { attributionTs: start + 2 * day });
  const conversions = versionCohortConversions(installs, [...events, events[0], revised], new Map(), start, start + day, asOf).get("1.3.0")!;
  const rows = versyOfferRows(conversions.global.offerBreakdown);
  assert.equal(conversions.global.installs, 6);
  assert.equal(conversions.global.proceeds, 84);
  assert.deepEqual(rows.map((row) => [row.key, row.subscriptions, row.proceeds]), [["main", 2, 69], ["weekly", 1, 3], ["recovery", 1, 12]]);
  assert.deepEqual(rows[0].children.map((row) => [row.subscriptions, row.proceeds]), [[1, 29], [1, 40]]);
  assert.equal(rows.reduce((sum, row) => sum + row.proceeds / 6, 0), conversions.global.proceeds / 6);
  assert.doesNotMatch(JSON.stringify(conversions.global.offerBreakdown), /originalTransactionId|appUserId|w2/);
});

test("date, country, language and acquisition slices keep their own offer counts and denominators", () => {
  const attributes = new Map([["39", { acquisition_source: "meta" }]]);
  const report = buildAnalyticsMarkets({ period: "week", startMs: start, endMs: start + day, asOf, installs, events, attributes, downloads: [] });
  const global = report.slices["all:all"];
  assert.equal(global.overview.total.proceeds, 85);
  assert.equal(versyOfferRows(global.overview.total.offerBreakdown)[0].subscriptions, 2);
  assert.equal(versyOfferRows(report.slices["pt:BR"].overview.total.offerBreakdown)[2].subscriptions, 1);
  assert.equal(versyOfferRows(report.slices["en:US"].overview.total.offerBreakdown)[2].subscriptions, 0);
  assert.equal(versyOfferRows(global.conversions.metaAds.offerBreakdown)[0].proceeds, 30);
  assert.equal(versyOfferRows(global.conversions.nonAds.offerBreakdown)[0].proceeds, 40);
  const daily = overviewDailyPoints(global.overview)[0].dailyTotal;
  assert.equal(versyOfferRows(daily.offerBreakdown).reduce((sum, row) => sum + row.proceeds, 0), daily.proceeds);
  assert.equal(versyOfferRows(daily.offerBreakdown)[1].subscriptions, 1);
});

test("pre-assignment chains and future money never enter a cohort's offer mix", () => {
  const result = versionCohortConversions(installs, [...events, charge("49", products[1], 200, { eventTs: asOf + day })],
    new Map(), start, start + day, asOf, new Map([["weekly", start + 2 * day]])).get("1.3.0")!.global;
  assert.equal(result.proceeds, 82);
  assert.equal(versyOfferRows(result.offerBreakdown)[1].subscriptions, 0);
});

test("missing authoritative money withholds the mix rather than displaying partial revenue shares", () => {
  const report = buildAppOverviewCohorts({ period: "week", startMs: start, endMs: start + day, asOf, installs,
    events: [...events, charge("free", products[3], null)], downloads: [] });
  const html = renderToStaticMarkup(createElement(VersyOfferBreakdown, { enabled: true, inline: true,
    breakdown: report.total.offerBreakdown, users: 6, proceeds: report.total.proceeds }));
  assert.match(html, /Offer mix unavailable/);
  assert.doesNotMatch(html, /Paid subs|Share/);
});

test("retired $17.99 and unknown products remain separate from the current recovery offer", () => {
  const target: WithOfferBreakdown = {};
  const add = createOfferAccumulator();
  add(target, charge("old", prefix + "yearly_2999_80", 15));
  add(target, charge("unknown", "new-product", -2, { isRefund: true }));
  add(target, charge("gift", products[3], 12));
  const rows = versyOfferRows(target.offerBreakdown);
  assert.equal(rows[2].subscriptions, 1);
  assert.equal(rows[2].proceeds, 12);
  assert.equal(rows[3].subscriptions, 1);
  assert.equal(rows[3].proceeds, 13);
});

test("missing product fields follow the exact charged product; an ambiguous plan-switch renewal stays unknown", () => {
  const resolve = offerProductResolver([charge("39", products[0], 30), charge("39", products[1], 40, { transactionId: "upgrade" })]);
  assert.equal(resolve(charge("", "", -30, { originalTransactionId: "39", transactionId: "39", isRefund: true })), products[0]);
  assert.equal(resolve(charge("", "", 40, { originalTransactionId: "39", transactionId: "next" })), undefined);
});

test("the UI shows separate yearly counts, contribution and shares, including negative refunds and empty cohorts", () => {
  const metric = versionCohortConversions(installs, events, new Map(), start, start + day, asOf).get("1.3.0")!.global;
  const html = renderToStaticMarkup(createElement(VersyOfferBreakdown, { enabled: true, inline: true,
    breakdown: metric.offerBreakdown, users: metric.installs, proceeds: metric.proceeds }));
  for (const label of ["Main offer", "$39.99 yearly", "$49.99 yearly", "Side offer", "Weekly", "Recovery / daily gift", "APPU contribution", "82.4%", "$11.67"]) assert.ok(html.includes(label), label);
  assert.equal(renderToStaticMarkup(createElement(VersyOfferBreakdown, { users: 6, proceeds: 85 })), "");
  const negative = renderToStaticMarkup(createElement(VersyOfferBreakdown, { enabled: true, inline: true, users: 6, proceeds: -3,
    breakdown: { [products[2]]: { subscriptions: 0, proceeds: -3, missingMoney: false } } }));
  assert.match(negative, /-\$0\.50/);
  assert.doesNotMatch(negative, /NaN|Infinity|Share of net proceeds by offer/);
  const empty = renderToStaticMarkup(createElement(VersyOfferBreakdown, { enabled: true, users: 0, proceeds: 0 }));
  assert.match(empty, /Main 0 · Weekly 0 · Recovery 0/);
});

test("native placements use the bought product, not the assigned yearly product, and keep refunds with it", () => {
  const record: PaywallRecord = { schema: 1, environment: "production", experiment: "versy_onboarding_outcomes_v1", experimentName: "Onboarding",
    variant: "scroll_the_bible", variantName: "Scroll", paywall: "scroll_the_bible", language: "en", assignedAt: start,
    randomized: false, variantCount: 1, expectedProduct: products[1], allowedProducts: products, viewedAt: start + 1,
    placement: "onboarding_scroll_bible", reachedAt: start + 1 };
  const attributes = [{ appUserId: "reader", key: "gp1_a_versy_onboarding_outcomes_v1", value: JSON.stringify({ ...record, placement: undefined, reachedAt: undefined }) },
    { appUserId: "reader", key: "gp1_p_versy_onboarding_outcomes_v1__onboarding_scroll_bible", value: JSON.stringify(record) },
    { appUserId: "reader", key: "gp1_t_100", value: JSON.stringify({ context: record, productID: products[2], startedAt: start + 2, purchasedAt: start + 3, transactionID: "100", originalTransactionID: "100" }) }];
  const revenue = (transactionId: string, proceeds: number, isRefund = 0): PaywallRevenue => ({ id: transactionId, transactionId,
    name: isRefund ? "cancellation" : transactionId === "100" ? "initial_purchase" : "renewal", originalTransactionId: "100",
    proceeds, price: 4, isRefund, ts: new Date(start + day).toISOString(), purchasedAt: new Date(start + day).toISOString(), attributionTs: new Date(start + day).toISOString() });
  const report = buildNativePaywallReport(attributes, [revenue("100", 3), revenue("101", 3), revenue("101", 3, 1)], start, start + day, asOf);
  const group = report.groups.find((row) => row.language === "all")!;
  for (const metric of [group.paywalls[0], group.placements[0]]) {
    const rows = versyOfferRows(metric.offerBreakdown);
    assert.equal(rows[0].subscriptions, 0);
    assert.equal(rows[1].subscriptions, 1);
    assert.equal(rows[1].proceeds, metric.proceeds);
  }
  const pending = buildNativePaywallReport(attributes, [], start, start + day, asOf).groups.find((row) => row.language === "all")!;
  assert.ok(versyOfferRows(pending.paywalls[0].offerBreakdown).some((row) => row.missingMoney));
});
