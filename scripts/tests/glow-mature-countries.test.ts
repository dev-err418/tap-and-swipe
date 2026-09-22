import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppOverviewPanel from "../../components/analytics/AppOverviewPanel";
import { glowMatureCountries } from "../../lib/glow-mature-countries";

const DAY = 86_400_000;
const start = Date.parse("2026-10-20T00:00:00Z");
const now = start + 10 * DAY;
const install = (appUserId: string, day = 0, country = "US") => ({ appUserId, installedAt: start + day * DAY, country });
const event = (appUserId: string, day: number, overrides: Partial<Parameters<typeof glowMatureCountries>[0]["events"][number]> = {}) => ({
  appUserId, originalTransactionId: appUserId, transactionId: `${appUserId}-${day}`, name: "initial_purchase", periodType: "trial",
  isTrialConversion: false, eventTs: start + day * DAY, attributionTs: start + day * DAY, netProceeds: 0, ...overrides,
});
const facts = (installs: ReturnType<typeof install>[], events: ReturnType<typeof event>[], endMs = now) => ({ startMs: start, endMs, installs, events });

test("72-hour maturity excludes recent installs and trials from every metric, including immediate buyers", () => {
  const input = facts([install("converted"), install("free"), install("recent", 8), install("late"), install("direct", 8)], [
    event("converted", 0), event("converted", 3, { name: "renewal", periodType: "normal", isTrialConversion: true, netProceeds: 20 }),
    event("recent", 8), event("late", 9), event("direct", 8, { periodType: "normal", netProceeds: 100 }),
  ]);
  assert.deepEqual(glowMatureCountries(input, now), [{ country: "US", installs: 2, trials: 1, paid: 1, converted: 1, proceeds: 20 }]);
  assert.equal(input.installs.length, 5);
  assert.equal(input.events.length, 5);
});

test("exactly 72 elapsed hours qualifies, with early cancellations and non-payers retained", () => {
  const input = facts([install("boundary", 7), install("too-young", 7 + 1 / DAY), install("cancelled", 7)], [
    event("boundary", 7), event("too-young", 7 + 1 / DAY), event("cancelled", 7),
    event("cancelled", 7.1, { name: "cancellation", transactionId: "cancelled-7" }),
  ]);
  assert.deepEqual(glowMatureCountries(input, now), [{ country: "US", installs: 2, trials: 2, paid: 0, converted: 0, proceeds: 0 }]);
});

test("selected install cohort follows later conversions, renewals and refunds through today", () => {
  const charge = event("buyer", 4, { name: "renewal", periodType: "normal", isTrialConversion: true, netProceeds: 20 });
  const input = facts([install("buyer", 0, "ES"), install("old", -1), install("outside", 2)], [
    event("buyer", 1), charge, { ...charge, attributionTs: charge.attributionTs + 1 },
    event("buyer", 8, { name: "renewal", periodType: "normal", netProceeds: 20 }),
    event("buyer", 9, { name: "cancellation", transactionId: "buyer-8", netProceeds: -20 }),
    event("buyer", 11, { name: "renewal", netProceeds: 200 }),
    event("old", 4, { name: "renewal", netProceeds: 200 }),
    event("outside", 4, { name: "renewal", netProceeds: 200 }),
  ], start + 2 * DAY);
  assert.deepEqual(glowMatureCountries(input, now), [{ country: "ES", installs: 1, trials: 1, converted: 1, paid: 1, proceeds: 20 }]);
});

test("missing identity follows a known subscription chain; unrelated revenue cannot inflate the cohort", () => {
  const input = facts([install("buyer")], [
    event("buyer", 0), event("", 3, { originalTransactionId: "buyer", name: "renewal", periodType: "normal", isTrialConversion: true, netProceeds: 10 }),
    event("unknown", 3, { name: "renewal", netProceeds: 1000 }),
    event("buyer", -1, { name: "renewal", netProceeds: 1000 }),
  ]);
  assert.equal(glowMatureCountries(input, now)[0].proceeds, 10);
  assert.equal(glowMatureCountries(input, now)[0].paid, 1);
});

test("recent-only periods have no mature results instead of borrowing older users", () => {
  const input = { ...facts([install("recent", 9), install("old", 0)], []), startMs: start + 9 * DAY };
  assert.deepEqual(glowMatureCountries(input, now), []);
});

test("APPU and install-to-paid CR use mature data while overview totals retain all selected-period data", () => {
  const countries = [{ country: "US", installs: 99, proceeds: 99, trials: 10, converted: 1, paid: 1 }];
  const dataCountries = [{ country: "ES", installs: 4, proceeds: 20, trials: 2, converted: 1, paid: 1 }];
  const props = { appId: "glow" as const, installs: 99, proceeds: 99, paid: 1, windowLabel: "Last 30 days", trend: [], countries, plans: [], retention: [] };
  const markup = renderToStaticMarkup(createElement(AppOverviewPanel, { ...props, dataCountries }));
  const chartMarkup = markup.split('id="app-analytics-panel-data"')[1];
  assert.match(markup.split('id="app-analytics-panel-data"')[0], /99/);
  // Each chart renders its country label twice to contrast against the bars.
  assert.equal(chartMarkup.match(/Spain/g)?.length, 4);
  assert.doesNotMatch(chartMarkup, /United States/);
  assert.match(chartMarkup, /25%/); // CR = 1 paid user / 4 mature installs.
  assert.doesNotMatch(chartMarkup, /50%|10\.1%/);
  const empty = renderToStaticMarkup(createElement(AppOverviewPanel, { ...props, dataCountries: [] })).split('id="app-analytics-panel-data"')[1];
  assert.doesNotMatch(empty, /Spain/);
  assert.doesNotMatch(empty, /United States/);
  const unchanged = renderToStaticMarkup(createElement(AppOverviewPanel, { ...props, appId: "poky" })).split('id="app-analytics-panel-data"')[1];
  assert.equal(unchanged.match(/United States/g)?.length, 4);
  assert.doesNotMatch(unchanged, /10\.1%/);
});
