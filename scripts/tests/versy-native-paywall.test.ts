import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import NativePaywallsPanel from "../../components/analytics/NativePaywallsPanel";
import { buildNativePaywallReport, type PaywallRecord, type PaywallAttribute, type PaywallRevenue } from "../../lib/native-paywall-analytics";
import { loadNativePaywalls } from "../../lib/native-paywall-queries";

const start = Date.parse("2026-10-01T00:00:00Z");
const day = 86_400_000;
const experiment = "versy_onboarding_outcomes_v1";
const attr = (owner: string, key: string, value: unknown): PaywallAttribute => ({ appUserId: owner, key, value: JSON.stringify(value) });
const context = (variant = "scroll_the_bible", env = "production"): PaywallRecord => ({
  schema: 1, environment: env, experiment, experimentName: "Onboarding outcomes · all countries",
  variant, variantName: variant === "scroll_the_bible" ? "Bible Scroll" : "Bible Widget",
  paywall: variant, language: "pt", assignedAt: start, randomized: false, variantCount: 3,
  expectedProduct: "annual", allowedProducts: ["annual", "weekly"],
});
function purchaseAttributes() {
  const a = context();
  const placement = { ...a, placement: "onboarding_scroll_bible", reachedAt: start + 1000, viewedAt: start + 2000, displayedProduct: "weekly" };
  return [attr("reader", `gp1_a_${experiment}`, a), attr("reader", `gp1_p_${experiment}__onboarding_scroll_bible`, placement),
    attr("reader", "gp1_t_100", { context: placement, productID: "weekly", startedAt: start + 3000, purchasedAt: start + 4000, transactionID: "100", originalTransactionID: "100" }),
    attr("nonpayer", `gp1_a_${experiment}`, a), attr("widget", `gp1_a_${experiment}`, context("bible_widget")),
    attr("debug", `gp1_a_${experiment}`, context("bible_widget", "development")),
  ];
}
function money(tx: string, name: string, proceeds: number, offset: number, refund = false): PaywallRevenue {
  const at = new Date(start + offset).toISOString();
  return { appUserId: "reader", id: `${tx}-${refund}`, name, transactionId: tx, originalTransactionId: "100",
    isRefund: refund ? 1 : 0, proceeds, price: proceeds ? 10 : 0, ts: at, purchasedAt: at, attributionTs: at };
}

test("Versy reports weekly conversions, renewals and refunds against the original onboarding with nonpayers included", () => {
  const result = buildNativePaywallReport(purchaseAttributes(), [
    money("100", "initial_purchase", 8.5, 4000), money("101", "renewal", 8.5, day),
    money("101", "cancellation", 8.5, 2 * day, true), money("101", "renewal", 8.5, day),
  ], start, start + day, start + 3 * day);
  const all = result.groups.find((g) => g.language === "all")!;
  const scroll = all.paywalls.find((r) => r.label === "Bible Scroll")!;
  assert.equal(scroll.users, 2);
  assert.equal(scroll.views, 1);
  assert.equal(scroll.conversions, 1);
  assert.equal(scroll.paid, 1);
  assert.equal(scroll.proceeds, 8.5);
  assert.equal(scroll.estimate.appu, 4.25);
  assert.equal(scroll.refunds, 10);
  assert.equal(scroll.estimate.chanceBest, null); // forced-country assignments are descriptive
  assert.equal(all.placements[0].proceeds, scroll.proceeds);
  assert.equal(all.paywalls.find((r) => r.label === "Bible Widget")?.users, 1);
  const markup = renderToStaticMarkup(createElement(NativePaywallsPanel, { appId: "versy", report: result }));
  assert.match(markup, /All languages/);
  assert.match(markup, /Portuguese/);
  assert.match(markup, /Paid users/);
  assert.match(markup, /Onboarding variants/);
  assert.match(markup, /\$8\.50/);
});

test("a trial counts as a verified conversion, but not a paid user or paid revenue", () => {
  const report = buildNativePaywallReport(purchaseAttributes(), [money("100", "initial_purchase", 0, 4000)], start, start + day, start + 3 * day);
  const row = report.groups.find((g) => g.language === "all")!.paywalls.find((r) => r.label === "Bible Scroll")!;
  assert.equal(row.conversions, 1);
  assert.equal(row.paid, 0);
  assert.equal(row.proceeds, 0);
});

test("Versy loader requests only its application and joins server revenue by original transaction ID", async () => {
  const queries: string[] = [];
  const result = await loadNativePaywalls(async <T,>(sql: string): Promise<T[]> => {
    queries.push(sql);
    if (sql.includes("sw.user_attributes_rep")) return purchaseAttributes() as T[];
    assert.match(sql, /applicationId = 51393/);
    assert.match(sql, /source = 'integration'/);
    assert.match(sql, /originalTransactionId IN \('100'\)/);
    assert.match(sql, /isRefund = 1/);
    return [money("100", "initial_purchase", 8.5, 4000)] as T[];
  }, 51393, start, start + day);
  assert.equal(result.status, "ready");
  assert.equal(queries.length, 2);
  assert.equal(result.groups.find((g) => g.language === "all")?.paywalls.find((r) => r.label === "Bible Scroll")?.proceeds, 8.5);
});

test("before the iOS release the dashboard explains empty attribution without invented revenue", () => {
  const report = buildNativePaywallReport([], [], start, start + day, start + 3 * day);
  const markup = renderToStaticMarkup(createElement(NativePaywallsPanel, { appId: "versy", report }));
  assert.match(markup, /updated iOS app/);
  assert.match(markup, /A\/B tests/);
  assert.doesNotMatch(markup, /\$0\.00/);
});
