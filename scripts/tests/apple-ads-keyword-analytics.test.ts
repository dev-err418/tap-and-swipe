import assert from "node:assert/strict";
import test from "node:test";
import { buildAppleAdsKeywordReport, type AppleAdsKeywordRow } from "../../lib/apple-ads-keyword-analytics";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppleAdsKeywordTable from "../../components/analytics/AppleAdsKeywordTable";
import { addAppleKeywordSpend } from "../../lib/apple-ads-keyword-spend";
import { generateKeyPairSync } from "node:crypto";
import { realizedKeywordRoas } from "../../lib/apple-ads-keyword-roas";

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

test("last week calculates realized ROAS with mixed mature/pending users and each country's actual spend", async () => {
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
    return Response.json({ data: { reportingDataResponse: { row: [
      { metadata: { keyword: "daily affirmations", countryOrRegion: "US" }, total: { localSpend: { amount: "10", currency: "EUR" } } },
      { metadata: { keyword: "daily affirmations", countryOrRegion: "DE" }, total: { localSpend: { amount: "5", currency: "EUR" } } },
    ] } } });
  }) as typeof fetch;
  try {
    const weekStart = Date.parse("2026-10-13T00:00:00Z");
    const attributes = new Map([["a", attr("daily affirmations", "1")], ["b", attr("daily affirmations", "2")],
      ["c", attr("daily affirmations", "3", "DE")]]);
    const installs = ["a", "b", "c"].map((id) => ({ ...install(id), installedAt: id === "b" ? asOf - 86400000 : weekStart + 1000 }));
    const paid = (user: string, proceeds: number) => event(user, "initial_purchase", user, {
      netProceeds: proceeds, eventTs: weekStart + 2000, purchasedAt: weekStart + 2000 });
    const cohort = buildAppleAdsKeywordReport(installs, [paid("a", 12), paid("c", 6)], attributes, weekStart, asOf, asOf);
    assert.equal(cohort.rows[0].realizedAppu?.users, 2);
    assert.equal(cohort.rows[0].users, 3);
    const report = await addAppleKeywordSpend(cohort, weekStart, asOf, ["10", "11"]);
    assert.equal(report.rows[0].spend, 15);
    assert.equal(report.rows[0].spendUsd, 18);
    assert.equal(report.rows[0].realizedRoas, 1.5);
    assert.equal(report.countries.US[0].spend, 10);
    assert.equal(report.countries.US[0].realizedRoas, 2);
    assert.equal(report.countries.DE[0].realizedRoas, 1);
    assert.equal(requests.length, 1); // No empty eight-day historical spend query.
    assert.ok(requests.every((request) => JSON.stringify(request).includes('"startTime":"2026-10-13"')));
    assert.ok(requests.every((request) => JSON.stringify(request).includes('"adGroupDeleted"')));
    const html = renderToStaticMarkup(createElement(AppleAdsKeywordTable, { report, country: "US", windowLabel: "Last 30 days" }));
    assert.match(html, /€10\.00/);
    assert.match(html, /100\.0%/);
    assert.match(html, /≈200\.0% realized/);
    assert.match(html, /Estimated realized ROAS/);
  } finally {
    globalThis.fetch = savedFetch;
    for (const key of keys) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  }
});

test("realized ROAS distinguishes pending users, zero proceeds, refunds and missing spend/money", () => {
  const row: AppleAdsKeywordRow = { key: "10|keyword", keyword: "keyword", campaignId: "10", keywordIds: ["1"],
    users: 10, trials: 5, finishedTrials: 2, convertedTrials: 1, paidUsers: 1, proceeds: 12, missingMoney: false,
    spend: 20, spendCurrency: "USD", spendUsd: 20, realizedAppu: { users: 4, proceeds: 12, missingMoney: false } };
  assert.equal(realizedKeywordRoas(row), 1.5);
  assert.equal(realizedKeywordRoas({ ...row, realizedAppu: { users: 4, proceeds: 0, missingMoney: false } }), 0);
  assert.equal(realizedKeywordRoas({ ...row, realizedAppu: { users: 4, proceeds: -8, missingMoney: false } }), -1);
  for (const changed of [{ spendUsd: undefined }, { spendUsd: 0 }, { spendUsd: NaN }, { users: 0 }, { missingMoney: true },
    { realizedAppu: undefined }, { realizedAppu: { users: 0, proceeds: 0, missingMoney: false } },
    { realizedAppu: { users: 4, proceeds: 12, missingMoney: true } }]) {
    assert.equal(realizedKeywordRoas({ ...row, ...changed }), null);
  }
  const markup = (item: AppleAdsKeywordRow) => renderToStaticMarkup(createElement(AppleAdsKeywordTable, {
    report: { available: true, rows: [item], countries: {}, excludedConflictingAttribution: 0 }, country: "all", windowLabel: "Last week" }));
  assert.match(markup({ ...row, realizedAppu: { users: 0, proceeds: 0, missingMoney: false } }), /realized pending/);
  assert.match(markup({ ...row, spendUsd: null }), /positive USD keyword spend are missing/);
  assert.match(markup({ ...row, realizedRoas: 999 }), /≈150\.0% realized/); // Never reuse an older stored formula.
});
