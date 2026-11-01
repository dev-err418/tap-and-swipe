import assert from "node:assert/strict";
import test from "node:test";
import { buildAppleAdsKeywordReport } from "../../lib/apple-ads-keyword-analytics";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppleAdsKeywordTable from "../../components/analytics/AppleAdsKeywordTable";
import { addAppleKeywordSpend } from "../../lib/apple-ads-keyword-spend";
import { generateKeyPairSync } from "node:crypto";

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
  assert.match(html, /realized/);
  assert.doesNotMatch(html, /Campaign 10|Bids are not spend|first-launch cohorts/);
  assert.match(html, /100\.0%/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("joins actual country-specific spend and calculates ROAS using the matching mature cohort", async () => {
  const savedFetch = globalThis.fetch;
  const keys = ["APPLE_ADS_CLIENT_ID", "APPLE_ADS_TEAM_ID", "APPLE_ADS_KEY_ID", "APPLE_ADS_ORG_ID", "APPLE_ADS_PRIVATE_KEY"] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const key = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ type: "pkcs8", format: "pem" });
  Object.assign(process.env, { APPLE_ADS_CLIENT_ID: "client", APPLE_ADS_TEAM_ID: "team", APPLE_ADS_KEY_ID: "key", APPLE_ADS_ORG_ID: "10", APPLE_ADS_PRIVATE_KEY: key });
  const requests: unknown[] = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.includes("appleid.apple.com")) return Response.json({ access_token: "test" });
    if (url.includes("ecb.europa.eu")) return new Response("<Cube currency='USD' rate='1.2'/>");
    if (url.includes("/campaigns/11/")) return new Response("failed", { status: 503 });
    const body = JSON.parse(String(init?.body)); requests.push(body);
    const amount = body.endTime === "2026-10-09" ? "4" : "10";
    return Response.json({ data: { reportingDataResponse: { row: [{ metadata: { keyword: "daily affirmations", countryOrRegion: "US" },
      total: { localSpend: { amount, currency: "EUR" } } }] } } });
  }) as typeof fetch;
  try {
    const attributes = new Map([["a", attr("daily affirmations", "1")], ["b", attr("daily affirmations", "2")]]);
    const paid = event("a", "initial_purchase", "paid", { netProceeds: 12 });
    const cohort = buildAppleAdsKeywordReport([install("a"), install("b")], [paid], attributes, start, asOf, asOf);
    const report = await addAppleKeywordSpend(cohort, cohort, start, asOf, Date.parse("2026-10-10T00:00:00Z"), ["10", "11"]);
    assert.equal(report.rows[0].spend, 10);
    assert.equal(report.rows[0].spendUsd, 12);
    assert.equal(report.rows[0].realizedRoas, 2.5);
    assert.equal(report.countries.US[0].spend, 10);
    assert.ok(requests.every((request) => JSON.stringify(request).includes('"adGroupDeleted"')));
    const html = renderToStaticMarkup(createElement(AppleAdsKeywordTable, { report, country: "US", windowLabel: "Last 30 days" }));
    assert.match(html, /€10\.00/);
    assert.match(html, /100\.0%/);
    assert.match(html, /250\.0%/);
  } finally {
    globalThis.fetch = savedFetch;
    for (const key of keys) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  }
});
