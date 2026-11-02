import assert from "node:assert/strict";
import test from "node:test";
import { compactAppDataView } from "../../lib/app-analytics-data-view";
import { buildAnalyticsMarkets } from "../../lib/analytics-markets";
import type { MobileAppAnalytics } from "../../lib/mobile-app-analytics";

const start = Date.parse("2026-10-01T00:00:00Z"), day = 86400000;
test("compact app data preserves every selectable market and strict ROAS without mutating snapshots", () => {
  const markets = buildAnalyticsMarkets({ period: "month", startMs: start, endMs: start + 30 * day, asOf: start + 40 * day,
    installs: Array.from({ length: 30 }, (_, i) => ({ appUserId: String(i), installedAt: start, appVersion: "1.0",
      language: ["en", "es", "pt", "de", "fr"][i % 5], country: ["US", "GB", "BR", "DE", "FR", "ES"][i % 6] })),
    events: [], attributes: new Map(), downloads: [] });
  const matched = { key: "matched", realizedRoas: 2, realizedRoasBasis: { startMs: start, endMs: start + day, users: 1, matureUsers: 1, proceeds: 4, spendUsd: 2, missingMoney: false } };
  const report = { id: "glow", markets, countryComparisons: { options: [{ code: "US" }, { code: "GB" }], slices: {} },
    snapshotUpdatedAt: "2026-11-01T00:00:00Z", appleAdsKeywords: { rows: [matched, { key: "legacy", realizedRoas: 999 }], countries: { US: [matched] } },
  } as unknown as MobileAppAnalytics;
  const compact = compactAppDataView(report);
  assert.deepEqual(Object.keys(compact.markets!.slices).sort(), ["all:GB", "all:US", "all:all"]);
  for (const key of Object.keys(compact.markets!.slices)) assert.deepEqual(compact.markets!.slices[key], markets.slices[key]);
  assert.equal(compact.snapshotUpdatedAt, report.snapshotUpdatedAt);
  assert.equal(compact.appleAdsKeywords!.rows[0].realizedRoas, 2);
  assert.equal(compact.appleAdsKeywords!.countries.US[0].realizedRoas, 2);
  assert.equal(compact.appleAdsKeywords!.rows[1].realizedRoas, null);
  assert.equal(report.appleAdsKeywords!.rows[1].realizedRoas, 999);
  assert.ok(JSON.stringify(compact).length < JSON.stringify(report).length / 4);
});
