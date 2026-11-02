import assert from "node:assert/strict";
import test from "node:test";
import { buildAppleAdsKeywordReport, type AppleAdsKeywordRow } from "../../lib/apple-ads-keyword-analytics";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppleAdsKeywordTable from "../../components/analytics/AppleAdsKeywordTable";
import { addAppleKeywordSpend, keywordMatureEnd } from "../../lib/apple-ads-keyword-spend";
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

async function withAppleSpend(run: (requests: { endTime: string; startTime: string; selector: { conditions: unknown[] } }[]) => Promise<void>, failOlder = false) {
  const savedFetch = globalThis.fetch;
  const keys = ["APPLE_ADS_CLIENT_ID", "APPLE_ADS_TEAM_ID", "APPLE_ADS_KEY_ID", "APPLE_ADS_ORG_ID", "APPLE_ADS_PRIVATE_KEY"] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const key = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).privateKey.export({ type: "pkcs8", format: "pem" });
  Object.assign(process.env, { APPLE_ADS_CLIENT_ID: "client", APPLE_ADS_TEAM_ID: "team", APPLE_ADS_KEY_ID: "key", APPLE_ADS_ORG_ID: "10", APPLE_ADS_PRIVATE_KEY: key });
  const requests: Parameters<typeof run>[0] = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.includes("appleid.apple.com")) return Response.json({ access_token: "test" });
    if (url.includes("ecb.europa.eu")) return new Response("<Cube currency='USD' rate='1.2'/>");
    if (url.includes("/campaigns/11/")) return new Response("failed", { status: 503 });
    const body = JSON.parse(String(init?.body)); requests.push(body);
    const older = body.endTime === "2026-10-11";
    if (older && failOlder) return new Response("failed", { status: 503 });
    return Response.json({ data: { reportingDataResponse: { row: [
      { metadata: { keyword: "daily affirmations", countryOrRegion: "US" }, total: { localSpend: { amount: older ? "4" : "10", currency: "EUR" } } },
      { metadata: { keyword: "daily affirmations", countryOrRegion: "DE" }, total: { localSpend: { amount: older ? "2" : "5", currency: "EUR" } } },
    ] } } });
  }) as typeof fetch;
  try { await run(requests); }
  finally {
    globalThis.fetch = savedFetch;
    for (const key of keys) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
  }
}

function keywordCohorts(since = start, lateTrial = false) {
  const attributes = new Map([["a", attr("daily affirmations", "1")], ["b", attr("daily affirmations", "2")],
    ["c", attr("daily affirmations", "3", "DE")]]);
  const installs = ["a", "b", "c"].map((id) => ({ ...install(id), installedAt: id === "b" ? asOf - 86400000 : since + 1000 }));
  const paid = (user: string, proceeds: number) => event(user, "initial_purchase", user, {
    netProceeds: proceeds, eventTs: since + 2000, purchasedAt: since + 2000 });
  const events = [paid("a", 12), paid("c", 6)];
  if (lateTrial) events.push(event("a", "initial_purchase", "late-trial", {
    periodType: "trial", eventTs: asOf - 1000, purchasedAt: asOf - 1000, expiresAt: asOf + 86400000 }));
  const matureEnd = Math.max(since, keywordMatureEnd(asOf));
  return { matureEnd,
    current: buildAppleAdsKeywordReport(installs, events, attributes, since, asOf, asOf),
    mature: buildAppleAdsKeywordReport(installs, events, attributes, since, matureEnd, asOf) };
}

const markup = (item: AppleAdsKeywordRow) => renderToStaticMarkup(createElement(AppleAdsKeywordTable, {
  report: { available: true, rows: [item], countries: {}, excludedConflictingAttribution: 0 }, country: "all", windowLabel: "Last week" }));

test("strict realized ROAS matches older-period revenue and actual spend for each country", async () => {
  await withAppleSpend(async (requests) => {
    const { current, mature, matureEnd } = keywordCohorts();
    assert.equal(current.rows[0].users, 3);
    assert.equal(mature.rows[0].users, 2);
    const report = await addAppleKeywordSpend(current, mature, start, asOf, matureEnd, ["10", "11"]);
    assert.equal(report.rows[0].spend, 15);
    assert.equal(report.rows[0].spendUsd, 18);
    assert.ok(Math.abs(report.rows[0].realizedRoas! - 2.5) < 1e-10); // 18 USD / 6 EUR * 1.2 USD/EUR, not average cost.
    assert.equal(report.countries.US[0].realizedRoas, 2.5);
    assert.equal(report.countries.DE[0].realizedRoas, 2.5);
    assert.equal(report.rows[0].realizedRoasBasis?.startMs, start);
    assert.equal(report.rows[0].realizedRoasBasis?.endMs, matureEnd);
    assert.deepEqual(requests.map((request) => request.endTime).sort(), ["2026-10-11", "2026-10-20"]);
    assert.ok(requests.every((request) => request.startTime === "2026-10-01"));
    assert.deepEqual(requests[0].selector.conditions, [
      { field: "deleted", operator: "IN", values: ["false", "true"] },
      { field: "adGroupDeleted", operator: "IN", values: ["false", "true"] },
    ]);
    assert.match(markup(report.rows[0]), /250\.0% realized/);
    assert.match(markup(report.rows[0]), /2026-10-01 through 2026-10-11 UTC/);
    assert.doesNotMatch(markup(report.rows[0]), /≈|Estimated realized/);
  });
});

test("last week stays pending even if some short trials already matured", async () => {
  await withAppleSpend(async (requests) => {
    const weekStart = Date.parse("2026-10-13T00:00:00Z");
    const { current, mature, matureEnd } = keywordCohorts(weekStart);
    assert.equal(current.rows[0].realizedAppu?.users, 2);
    assert.equal(matureEnd, weekStart);
    const report = await addAppleKeywordSpend(current, mature, weekStart, asOf, matureEnd, ["10"]);
    assert.equal(report.rows[0].realizedRoas, null);
    assert.equal(report.rows[0].spendUsd, 18);
    assert.equal(requests.length, 1); // No invalid empty/reversed Apple date query.
    assert.match(markup(report.rows[0]), /realized pending/);
  });
});

test("a late trial keeps the matched older cohort pending without dropping other countries", async () => {
  await withAppleSpend(async () => {
    const { current, mature, matureEnd } = keywordCohorts(start, true);
    const report = await addAppleKeywordSpend(current, mature, start, asOf, matureEnd, ["10"]);
    assert.equal(report.rows[0].realizedRoas, null);
    assert.equal(report.countries.US[0].realizedRoas, null);
    assert.equal(report.countries.DE[0].realizedRoas, 2.5);
    assert.match(markup(report.rows[0]), /realized pending/);
  });
});

test("older-period spend failure never falls back to average cost or hides full-period spend", async () => {
  await withAppleSpend(async () => {
    const { current, mature, matureEnd } = keywordCohorts();
    const report = await addAppleKeywordSpend(current, mature, start, asOf, matureEnd, ["10"]);
    assert.equal(report.rows[0].spendUsd, 18);
    assert.equal(report.rows[0].realizedRoas, null);
    assert.equal(report.rows[0].realizedRoasBasis?.spendUsd, null);
    assert.match(markup(report.rows[0]), /matched older-period proceeds or positive USD keyword spend are missing/);
  }, true);
});

test("strict realized ROAS handles nonpayers/refunds and rejects incomplete or previously estimated ratios", () => {
  const basis = { startMs: start, endMs: keywordMatureEnd(asOf), users: 4, matureUsers: 4, proceeds: 12, spendUsd: 8, missingMoney: false };
  const row: AppleAdsKeywordRow = { key: "10|keyword", keyword: "keyword", campaignId: "10", keywordIds: ["1"],
    users: 10, trials: 5, finishedTrials: 2, convertedTrials: 1, paidUsers: 1, proceeds: 12, missingMoney: false,
    spend: 20, spendCurrency: "USD", spendUsd: 20, realizedAppu: { users: 4, proceeds: 12, missingMoney: false }, realizedRoasBasis: basis };
  assert.equal(realizedKeywordRoas(row), 1.5);
  assert.equal(realizedKeywordRoas({ ...row, realizedRoasBasis: { ...basis, proceeds: 0 } }), 0);
  assert.equal(realizedKeywordRoas({ ...row, realizedRoasBasis: { ...basis, proceeds: -8 } }), -1);
  for (const changed of [{ spendUsd: null }, { spendUsd: 0 }, { spendUsd: NaN }, { users: 0 }, { missingMoney: true },
    { matureUsers: 3 }, { matureUsers: 5 }, { proceeds: Infinity }, { endMs: start }]) {
    assert.equal(realizedKeywordRoas({ ...row, realizedRoasBasis: { ...basis, ...changed } }), null);
  }
  assert.equal(realizedKeywordRoas({ ...row, missingMoney: true }), 1.5); // Recent missing money is outside the matched period.
  const oldEstimate = { ...row, realizedRoasBasis: undefined, realizedRoas: 999 };
  assert.equal(realizedKeywordRoas(oldEstimate), null);
  assert.doesNotMatch(markup(oldEstimate), /99900\.0%|150\.0% realized|≈/);
  assert.match(markup(row), /150\.0% realized/);
});
