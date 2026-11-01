import assert from "node:assert/strict";
import test from "node:test";
import { buildAppleAdsKeywordReport } from "../../lib/apple-ads-keyword-analytics";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppleAdsKeywordTable from "../../components/analytics/AppleAdsKeywordTable";

const start = Date.parse("2026-10-01T00:00:00Z");
const asOf = Date.parse("2026-10-20T12:00:00Z");
const install = (id: string) => ({ appUserId: id, installedAt: start + 1000, appVersion: "1.0" });
const attr = (name: string, id: string, country = "US", campaign = "10") => ({
  apple_search_ads_attribution: "true", apple_search_ads_campaign_id: campaign,
  apple_search_ads_keyword_id: id, apple_search_ads_keyword_name: name, apple_search_ads_country_or_region: country,
});
const event = (user: string, name: string, transaction: string, extra: Record<string, unknown> = {}) => ({
  appUserId: user, originalTransactionId: `original-${user}`, transactionId: transaction, name,
  periodType: "normal", isRefund: false, netProceeds: 0, eventTs: start + 2000,
  attributionTs: start + 2000, expiresAt: start + 8000, purchasedAt: start + 2000, ...extra,
});

test("groups transferred keyword IDs, counts nonpayers and deduplicates revenue, with country splits", () => {
  const attributes = new Map<string, Record<string, string>>([["a", attr("Daily affirmations", "1")], ["b", attr("daily affirmations", "2")],
    ["c", attr("daily affirmations", "3", "DE")], ["d", attr("daily affirmations", "4", "US", "other")],
    ["meta", { ...attr("Daily affirmations", "1"), acquisition_source: "meta" }]]);
  const trial = event("a", "initial_purchase", "trial", { periodType: "trial", expiresAt: start + 8000 });
  const paid = event("a", "renewal", "paid", { netProceeds: 10, eventTs: start + 9000, purchasedAt: start + 9000 });
  const refund = event("a", "cancellation", "refund", { netProceeds: -2, isRefund: true, eventTs: start + 10000, purchasedAt: start + 10000 });
  const report = buildAppleAdsKeywordReport(["a", "b", "c", "d", "meta"].map(install), [trial, paid, paid, refund], attributes, start, asOf, asOf);
  assert.equal(report.excludedConflictingAttribution, 1);
  assert.equal(report.rows.length, 2);
  const row = report.rows.find((x) => x.campaignId === "10")!;
  assert.equal(row.users, 3);
  assert.deepEqual(row.keywordIds, ["1", "2", "3"]);
  assert.equal(row.trials, 1);
  assert.equal(row.finishedTrials, 1);
  assert.equal(row.convertedTrials, 1);
  assert.equal(row.paidUsers, 1);
  assert.equal(row.proceeds, 8);
  assert.equal(report.countries.US.find((x) => x.campaignId === "10")!.users, 2);
  assert.equal(report.countries.DE[0].users, 1);
});

test("excludes early renewal money until the paid period starts and keeps pending trials out of trial-to-paid denominator", () => {
  const attributes = new Map([["a", attr("study bible", "1")]]);
  const trial = event("a", "initial_purchase", "trial", { periodType: "trial", expiresAt: asOf + 60_000 });
  const renewal = event("a", "renewal", "paid", { netProceeds: 25, eventTs: asOf - 5000, purchasedAt: asOf + 60_000 });
  const before = buildAppleAdsKeywordReport([install("a")], [trial, renewal], attributes, start, asOf, asOf).rows[0];
  assert.equal(before.trials, 1);
  assert.equal(before.finishedTrials, 0);
  assert.equal(before.paidUsers, 0);
  assert.equal(before.proceeds, 0);
  const later = buildAppleAdsKeywordReport([install("a")], [trial, renewal], attributes, start, asOf, asOf + 120_000).rows[0];
  assert.equal(later.finishedTrials, 1);
  assert.equal(later.convertedTrials, 1);
  assert.equal(later.paidUsers, 1);
  assert.equal(later.proceeds, 25);
});

test("unknown keyword and purchase date are explicit, rather than guessed", () => {
  const attributes = new Map([["a", { apple_search_ads_attribution: "true", apple_search_ads_campaign_id: "10", apple_search_ads_keyword_id: "123" }]]);
  const paid = event("a", "initial_purchase", "paid", { netProceeds: 12, purchasedAt: undefined });
  const report = buildAppleAdsKeywordReport([install("a")], [paid], attributes, start, asOf, asOf);
  assert.equal(report.rows[0].keyword, "Keyword 123");
  assert.equal(report.rows[0].missingMoney, true);
  assert.equal(report.countries.unknown[0].users, 1);
});

test("keyword table displays Superwall cohort metrics and never fabricates ad spend", () => {
  const attributes = new Map([["a", attr("daily affirmations", "1")], ["b", attr("daily affirmations", "2")]]);
  const trial = event("a", "initial_purchase", "trial", { periodType: "trial", expiresAt: start + 8000 });
  const paid = event("a", "renewal", "paid", { netProceeds: 10, eventTs: start + 9000, purchasedAt: start + 9000 });
  const report = buildAppleAdsKeywordReport([install("a"), install("b")], [trial, paid], attributes, start, asOf, asOf);
  const html = renderToStaticMarkup(createElement(AppleAdsKeywordTable, { report, country: "all", windowLabel: "Last 30 days" }));
  assert.match(html, /daily affirmations/);
  assert.match(html, /\$10\.00/);
  assert.match(html, /\$5\.00/); // Both attributed users, including the nonpayer.
  assert.match(html, /Superwall provides spend at campaign level, not by keyword/);
  assert.match(html, /100\.0%/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});
