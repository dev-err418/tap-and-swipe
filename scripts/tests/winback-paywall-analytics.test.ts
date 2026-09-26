import assert from "node:assert/strict";
import test from "node:test";
import { summarizeWinbackPaywall } from "../../lib/winback-paywall-analytics";

test("offer conversion counts unique viewers only after a matching yearly-product view", () => {
  const report = summarizeWinbackPaywall([
    { userId: "a", source: "notification", productId: "yearly-a", views: 3, purchases: 1, firstView: 100, lastPurchase: 110 },
    { userId: "a", source: "notification", productId: "yearly-b", views: 1, purchases: 0, firstView: 120, lastPurchase: 0 },
    { userId: "b", source: "notification", productId: "yearly-a", views: 1, purchases: 1, firstView: 200, lastPurchase: 190 },
    { userId: "c", source: "settings", productId: "yearly-a", views: 1, purchases: 0, firstView: 300, lastPurchase: 0 },
    { userId: "d", source: "settings", productId: "yearly-b", views: 0, purchases: 1, firstView: 0, lastPurchase: 400 },
  ], "2026-09-01T00:00:00Z", "2026-09-30T00:00:00Z");

  assert.equal(report.status, "ready");
  assert.deepEqual([report.viewers, report.buyers, report.conversionRate], [3, 1, 1 / 3]);
  assert.deepEqual(report.sources.map(({ source, viewers, buyers }) => [source, viewers, buyers]), [
    ["notification", 2, 1], ["settings", 1, 0],
  ]);
  assert.deepEqual(report.products.map(({ productId, viewers, buyers }) => [productId, viewers, buyers]), [
    ["yearly-a", 3, 1], ["yearly-b", 1, 0],
  ]);
});

test("missing production views yield an empty report rather than a purchase conversion", () => {
  const report = summarizeWinbackPaywall([
    { userId: "a", source: "notification", productId: "yearly-a", views: 0, purchases: 1, firstView: 0, lastPurchase: 100 },
  ], "start", "end");
  assert.equal(report.status, "empty");
  assert.equal(report.conversionRate, null);
  assert.deepEqual(report.sources, []);
});
