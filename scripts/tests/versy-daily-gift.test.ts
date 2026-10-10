import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import NativePaywallsPanel from "../../components/analytics/NativePaywallsPanel";
import { buildNativePaywallReport, type PaywallRecord, type PaywallAttribute, type PaywallRevenue } from "../../lib/native-paywall-analytics";
import { nativePaywallAllocation } from "../../lib/native-paywall-allocation";
import { activeABTestCount, appExperimentMap } from "../../lib/app-experiment-map";
import { summarizeVersyPlacements } from "../../lib/versy-paywall-placements";

const start = Date.parse("2026-10-10T00:00:00Z");
const experiment = "versy_daily_gift_v1";
const placement = "daily_gift_app_open";
const product = "com.arthurbuildsstuff.bible.YearlyDiscount";
const record = (language = "en", environment = "production"): PaywallRecord => ({
  schema: 1, environment, experiment, experimentName: "Daily gift · returning non-premium users",
  variant: "daily_gift", variantName: "Daily gift", paywall: "daily_gift", language,
  assignedAt: start, randomized: false, variantCount: 1, expectedProduct: product, allowedProducts: [product],
});
const attr = (appUserId: string, key: string, value: unknown): PaywallAttribute => ({ appUserId, key, value: JSON.stringify(value) });

test("sealed reach, revealed views and gift money stay separate from onboarding and historical app-open", () => {
  const assignment = record();
  const sealed = { ...assignment, placement, reachedAt: start + 1000 };
  const revealed = { ...sealed, viewedAt: start + 2000, displayedProduct: product };
  const historical = { ...assignment, experiment: "versy_returning_paywalls_v1", experimentName: "Returning users", variant: "scroll_the_bible", variantName: "Bible Scroll", paywall: "scroll_the_bible" };
  const attributes = [
    attr("buyer", `gp1_a_${experiment}`, { ...assignment, viewedAt: revealed.viewedAt }),
    attr("buyer", `gp1_p_${experiment}__${placement}`, revealed),
    attr("buyer", "gp1_t_100", { context: revealed, productID: product, startedAt: start + 3000, purchasedAt: start + 4000, transactionID: "100", originalTransactionID: "100" }),
    attr("sealed", `gp1_a_${experiment}`, assignment),
    attr("sealed", `gp1_p_${experiment}__${placement}`, sealed),
    attr("buyer", `gp1_a_${historical.experiment}`, historical),
    attr("buyer", `gp1_p_${historical.experiment}__app_open`, { ...historical, placement: "app_open", reachedAt: start + 1000, viewedAt: start + 2000 }),
    ...["es", "pt", "de"].map((language) => attr(language, `gp1_a_${experiment}`, record(language))),
    ...["development", "sandbox"].map((environment) => attr(environment, `gp1_a_${experiment}`, record("en", environment))),
  ];
  const money = (id: string, offset: number, refund = false): PaywallRevenue => ({
    appUserId: "buyer", id: `${id}-${refund}`, name: refund ? "cancellation" : id === "100" ? "initial_purchase" : "renewal",
    transactionId: id, originalTransactionId: "100", proceeds: 8.5, price: 10, isRefund: refund ? 1 : 0,
    ts: new Date(start + offset).toISOString(), purchasedAt: new Date(start + offset).toISOString(), attributionTs: new Date(start + offset).toISOString(),
  });
  const report = buildNativePaywallReport(attributes, [money("100", 4000), money("101", 5000), money("101", 6000, true), money("100", 4000)], start, start + 86400000, start + 86400000);
  assert.deepEqual(report.warnings, []);
  const group = report.groups.find((g) => g.experiment === experiment && g.language === "all")!;
  assert.equal(group.paywalls[0].users, 5);
  assert.equal(group.paywalls[0].views, 1);
  assert.equal(group.paywalls[0].conversions, 1);
  assert.equal(group.paywalls[0].paid, 1);
  assert.equal(group.paywalls[0].proceeds, 8.5);
  assert.equal(group.paywalls[0].refunds, 10);
  assert.equal(group.paywalls[0].estimate.chanceBest, null);
  assert.equal(group.placements[0].id, placement);
  assert.equal(group.placements[0].users, 2);
  assert.equal(group.placements[0].views, 1);
  assert.equal(group.placements[0].proceeds, 8.5);
  assert.equal(report.groups.find((g) => g.experiment === historical.experiment && g.language === "all")!.paywalls[0].proceeds, 0);
  assert.deepEqual(report.groups.filter((g) => g.experiment === experiment).map((g) => g.language).sort(), ["all", "de", "en", "es", "pt"]);
  const markup = renderToStaticMarkup(createElement(NativePaywallsPanel, { appId: "versy", report: { ...report, groups: report.groups.filter((g) => g.experiment === experiment) } }));
  assert.match(markup, /Daily gift/);
  assert.match(markup, /sealed envelope/);
  assert.match(markup, /100% configured allocation/);
  assert.doesNotMatch(markup, /Onboarding variants/);
});

test("gift configuration remains a rollout and keeps the historical placement", () => {
  assert.equal(nativePaywallAllocation(experiment, "daily_gift|daily_gift", "daily_gift", "pt"), 100);
  assert.equal(activeABTestCount("versy"), 3);
  assert.ok(appExperimentMap("versy")?.notes.some((note) => note.includes(placement)));
  const report = summarizeVersyPlacements([], "2026-10-10", "2026-10-11");
  assert.ok(report.rows.some((row) => row.placement === placement));
  assert.ok(report.rows.some((row) => row.placement === "app_open"));
});


test("the configured gift is visible before production records arrive without invented metrics", () => {
  const report = buildNativePaywallReport([], [], start, start + 86400000, start + 86400000);
  const markup = renderToStaticMarkup(createElement(NativePaywallsPanel, { appId: "versy", report }));
  assert.match(markup, /Configured daily gift paywall/);
  assert.match(markup, /Brazilian Portuguese/);
  assert.match(markup, /after the updated iOS app is released/);
  assert.doesNotMatch(markup, /\$0\.00/);
});
