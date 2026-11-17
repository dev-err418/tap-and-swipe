import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { campaignDays, organicDays, roasDays, roasRatio, totalRoas, VERSY_META_MARKETS, type VersyRoasReport } from "../../lib/versy-meta-roas";
import { VersyMetaRoasTables } from "../../components/analytics/VersyMetaRoasTables";
const now = new Date("2026-11-16T12:00:00Z"), days = roasDays(now), day = 86_400_000;

test("30 daily columns include today and hatch only the last seven days", () => {
  assert.equal(days.length, 30);
  assert.equal(days[0].date, "2026-10-18");
  assert.equal(days.at(-1)?.date, "2026-11-16");
  assert.deepEqual(days.filter((d) => d.immature).map((d) => d.date), Array.from({ length: 7 }, (_, i) => `2026-11-${10 + i}`));
  assert.equal(roasRatio(20, 0), null);
  assert.equal(roasRatio(null, 20), null);
});

test("only selected campaigns contribute; blended ROAS is a ratio of summed money", () => {
  const campaigns = campaignDays({ data: [{ x: days[0].date, values: {
    "120255328753620450": { y: 2, extra: { netProceeds: 20, adSpend: 10 } },
    "120255385345590450": { y: 0.5, extra: { netProceeds: 15, adSpend: 30 } },
    "other-app": { y: 99, extra: { netProceeds: 999, adSpend: 999 } },
  } }] }, days);
  assert.equal(campaigns["other-app"], undefined);
  const report: VersyRoasReport = { status: "ready", updatedAt: now.toISOString(), days, campaigns, organic: { FR: { [days[0].date]: { installs: 3, proceeds: 5 } } } };
  assert.equal(totalRoas(report, VERSY_META_MARKETS[0], days[0].date), 1);
  report.organic.FR[days[0].date].proceeds = null;
  assert.equal(totalRoas(report, VERSY_META_MARKETS[0], days[0].date), null);
});

test("organic install cohorts exclude Meta and Apple Ads, and accrue later renewals and refunds", () => {
  const start = Date.parse("2026-11-01T10:00:00Z");
  const installs = ["organic", "meta", "apple"].map((appUserId) => ({ appUserId, installedAt: start, country: "FR", appVersion: "1.9.0" }));
  const attributes = new Map<string, Record<string, string>>([["meta", { acquisition_source: "meta" }], ["apple", { apple_search_ads_attribution: "true" }]]);
  const event = (transactionId: string, netProceeds: number, eventTs: number, isRefund = false) => ({ appUserId: "organic", originalTransactionId: "chain", transactionId,
    name: isRefund ? "cancellation" : "renewal", periodType: "normal", netProceeds, isRefund, isTrialConversion: false, eventTs, attributionTs: eventTs, expiresAt: 0 });
  const report = organicDays(installs, [event("paid", 20, start + 7 * day), event("weekly", 5, start + 14 * day), event("refund", -3, start + 14 * day, true)], attributes, days, now.getTime());
  assert.deepEqual(report.FR["2026-11-01"], { installs: 1, proceeds: 22 });
  assert.deepEqual(report.FR["2026-11-08"], { installs: 0, proceeds: 0 });
  assert.deepEqual(report.DE["2026-11-01"], { installs: 0, proceeds: 0 });
});

test("tables render country flags, three campaigns, hatching and unavailable state", () => {
  const report: VersyRoasReport = { status: "ready", updatedAt: now.toISOString(), days, campaigns: campaignDays({ data: [] }, days), organic: {} };
  const html = renderToStaticMarkup(createElement(VersyMetaRoasTables, { report }));
  assert.equal((html.match(/<table /g) ?? []).length, 2);
  for (const market of VERSY_META_MARKETS) {
    assert.ok(html.includes(market.flag));
    for (const campaign of market.campaigns) assert.ok(html.includes(campaign.name));
  }
  assert.ok(html.includes("repeating-linear-gradient"));
  assert.ok(html.includes("Total ROAS"));
  assert.ok(!html.includes("United States"));
  assert.ok(!html.includes("US - Trials - Versy"));
  assert.ok(!html.includes(">Installs<"));
  assert.ok(!html.includes("Proceeds accrue to install day"));
  const failed = renderToStaticMarkup(createElement(VersyMetaRoasTables, { report: { ...report, status: "unavailable" } }));
  assert.ok(failed.includes("could not be loaded"));
  assert.ok(!failed.includes("<table"));
});
