import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { appuComparisonReadiness } from "../../lib/arpu-comparison";
import { emptyVersionConversions } from "../../lib/version-cohort-conversions";
import { buildUserJourney, userJourneyDefinition } from "../../lib/user-journey";
import type { PaywallCohortComparison } from "../../lib/glow-paywall-cohort-comparisons";
import GlowPaywallCohortTables from "../../components/analytics/GlowPaywallCohortTables";
import PokyPaywallFlowTable from "../../components/analytics/PokyPaywallFlowTable";
import VersyYearlyPriceTable from "../../components/analytics/VersyYearlyPriceTable";
import UserJourneyFunnel from "../../components/analytics/UserJourneyFunnel";

function row(key: string, installs = 100, mean = 2, variance = 9) {
  return { key, metric: { ...emptyVersionConversions().global, installs, proceeds: mean * installs,
    proceedsVariance: variance, installPaid: Math.round(installs / 10) } };
}

test("APPU readiness uses observed variance and still collects when a variant is underfilled", () => {
  const stable = appuComparisonReadiness([row("a"), row("b")]);
  const noisy = appuComparisonReadiness([row("a", 100, 2, 90), row("b", 100, 2, 90)]);
  assert.equal(stable.status, "collecting");
  assert.equal(stable.confidenceLevel, 0.85);
  assert.ok(noisy.required! > stable.required!);
  const unbalanced = appuComparisonReadiness([row("a", 100_000), row("b", 20)]);
  assert.equal(unbalanced.status, "collecting");
  assert.ok(unbalanced.remaining! > 0);
});

test("reaching the APPU sample target does not by itself declare a winner", () => {
  const tied = appuComparisonReadiness([row("a", 10_000), row("b", 10_000)]);
  assert.equal(tied.status, "inconclusive");
  assert.equal(tied.remaining, 0);
  const winner = appuComparisonReadiness([row("a", 10_000), row("b", 10_000, 4)]);
  assert.equal(winner.status, "decisive");
});

test("missing proceeds or variance cannot produce a readiness target", () => {
  for (const metric of [undefined, { ...row("b").metric, missingProceeds: true },
    { ...row("b").metric, proceedsVariance: null }]) {
    const result = appuComparisonReadiness([row("a"), { key: "b", metric }]);
    assert.equal(result.status, "unavailable");
    assert.equal(result.confidenceLevel, 0.85);
    assert.equal(result.required, null);
    assert.ok(result.reason);
  }
});

test("empty planned variants cannot be dropped to declare readiness", () => {
  const result = appuComparisonReadiness([{ key: "empty", metric: emptyVersionConversions().global },
    row("a", 10_000), row("b", 10_000, 4)]);
  assert.equal(result.status, "collecting");
  assert.ok(result.remaining! > 0);
});

test("every compact experiment table restores the accessible readiness ring beside its title", () => {
  const comparison: PaywallCohortComparison = { status: "ready", warnings: [], labels: { a: "A", b: "B" },
    rows: [row("a"), row("b")].map(({ key, metric }) => ({ version: key, installs: metric.installs, tracked: metric.installs,
      variants: [], conversions: { ...emptyVersionConversions(), global: metric } })) };
  const examples = [
    { element: createElement(GlowPaywallCohortTables, { report: { flows: comparison, prices: comparison, flowPrices: comparison }, windowLabel: "Last week" }), count: 3 },
    { element: createElement(PokyPaywallFlowTable, { report: comparison, windowLabel: "Last week" }), count: 1 },
    { element: createElement(VersyYearlyPriceTable, { report: comparison }), count: 1 },
    ...(["glow", "poky", "versy"] as const).map((appId) => ({ element: createElement(UserJourneyFunnel, {
      appId, funnelOnly: true, windowLabel: "Last week", report: buildUserJourney(userJourneyDefinition(appId)!, []),
    }), count: 1 })),
  ];
  for (const { element, count } of examples) {
    const html = renderToStaticMarkup(element);
    assert.equal((html.match(/aria-label="(?:Collecting data|Planning pending)\./g) ?? []).length, count);
    assert.match(html, /cursor-help/);
    assert.match(html, /approximate 85% interval/);
    assert.doesNotMatch(html, /approximate 95% interval/);
  }
  const unavailable = renderToStaticMarkup(createElement(PokyPaywallFlowTable, { report: null, windowLabel: "Last week" }));
  assert.doesNotMatch(unavailable, /aria-label="(?:Collecting data|Planning pending)\./);
});
