import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import AppOverviewPanel from "../../components/analytics/AppOverviewPanel";
import { buildAnalyticsMarkets } from "../../lib/analytics-markets";
import { experimentMinimumInstallVersion } from "../../lib/app-experiment-cohort";
import { installCohortTrialSurvival } from "../../lib/install-cohort-trial-survival";

const day = 86_400_000, start = Date.parse("2026-10-01T00:00:00Z"), asOf = start + 20 * day;
const install = (appUserId: string, appVersion = "1.2.6", installedAt = start) => ({ appUserId, appVersion, installedAt });
type Event = Parameters<typeof installCohortTrialSurvival>[1][number];
const trial = (appUserId: string, extra: Partial<Event> = {}): Event => ({ appUserId, originalTransactionId: appUserId,
  name: "initial_purchase", periodType: "trial", isRefund: false, isTrialConversion: false,
  eventTs: start + day, expiresAt: start + 8 * day, ...extra });

test("survival uses first install versions across all time, excluding upgrades and unknown versions", () => {
  for (const [app, older, newer] of [["versy", "1.2.5", "1.2.7"], ["glow", "1.8.2", "1.8.4"]]) {
    const minimum = experimentMinimumInstallVersion(app)!;
    const installs = [install("current", minimum), install("newer", newer), install("old", older),
      install("old", newer, start + day), install("unknown", ""), install("future", newer, asOf + day)];
    const report = installCohortTrialSurvival(installs, installs.map((row) => trial(row.appUserId)), minimum, asOf);
    assert.equal(report.trials, 2, app);
  }
});

test("subscription ownership retains anonymous cancellations and refunds through report time", () => {
  const report = installCohortTrialSurvival([install("cancelled"), install("refunded"), install("active")], [
    trial("cancelled"), trial("refunded"),
    trial("", { originalTransactionId: "cancelled", name: "cancellation", eventTs: start + day + 15 * 60_000 }),
    trial("different-id", { originalTransactionId: "refunded", name: "cancellation", isRefund: true, eventTs: start + 2 * day }),
    trial("active", { eventTs: asOf - day, expiresAt: asOf + 6 * day }),
    trial("", { originalTransactionId: "active", name: "cancellation", eventTs: asOf + day }),
  ], "1.2.6", asOf);
  assert.equal(report.trials, 3);
  assert.equal(report.cancelled, 2);
  assert.equal(report.cancelledBeforeQualified, 1);
  assert.equal(report.activeTrials.total, 1);
});

test("pre-install chains, other users and shorter or unconfirmed trials stay out of survival", () => {
  const report = installCohortTrialSurvival([install("old-chain"), install("three"), install("unknown")], [
    trial("old-chain", { eventTs: start - day, expiresAt: start + 6 * day }),
    trial("old-chain", { name: "renewal" }), trial("outside"),
    trial("three", { expiresAt: start + 4 * day }), trial("unknown", { expiresAt: NaN }),
  ], "1.2.6", asOf);
  assert.equal(report.trials, 0);
});

test("the chart uses cohort timing and label even when date-window market timing exists", () => {
  const timing = installCohortTrialSurvival([install("eligible")], [trial("eligible")], "1.2.6", asOf);
  const markets = buildAnalyticsMarkets({ period: "week", startMs: asOf - 7 * day, endMs: asOf, asOf,
    installs: [{ ...install("recent", "1.2.6", asOf - day), language: "en", country: "US" }],
    events: [], attributes: new Map(), downloads: [] });
  markets.slices["all:all"].trialCancelTiming = { ...timing, trials: 43 };
  for (const appId of ["glow", "versy"] as const) {
    const html = renderToStaticMarkup(createElement(AppOverviewPanel, {
      appId, installs: 0, windowLabel: "Last 7 days", trend: [], countries: [], plans: [], retention: [], markets,
      trialCancelTiming: timing,
    }));
    const chart = html.slice(html.indexOf("Trial survival"));
    assert.match(chart, new RegExp(`Installed on v${experimentMinimumInstallVersion(appId)}\\+`));
    assert.match(chart, /1 of 1 would qualify/);
    assert.doesNotMatch(chart, /of 43 would qualify|Last 7 days/);
  }
});
