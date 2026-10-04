import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTestModule } from "./helpers/load-test-module";
import type { AppSprintFunnelAnalytics } from "../../lib/appsprint-funnel";

type Row = NonNullable<AppSprintFunnelAnalytics["ctaExperiment"]>[number];
const Panel = loadTestModule<{ default(props: { rows?: Row[]; windowDays: number }): ReactNode }>("components/analytics/MarketingCtaExperiment.tsx", {
  "./DashboardCard": { DashboardCard: ({ title, action, children }: { title: ReactNode; action: ReactNode; children: ReactNode }) => createElement("section", null, title, action, children) },
}).default;

test("CTA report distinguishes unavailable data from observed zero counts", () => {
  const html = renderToStaticMarkup(createElement(Panel, { rows: undefined, windowDays: 7 }));
  assert.match(html, /data is not available yet/);
  assert.match(html, /Last 7 days/);
  assert.doesNotMatch(html, /NaN|Infinity|winner:/);
});

test("CTA report renders the actual variants and computes unique-visitor CTR", () => {
  const base = { experiment: "seo_cta_message_2026_10_v3", page: "/tools/app-revenue-checker", pageLabel: "Revenue checker", placement: "result", position: "Immediately after estimates", eligibleVisitors: 200, viewers: 100, clickers: 12, checkoutVisitors: 3, paidVisitors: 1 };
  const rows = [{ ...base, variant: "control", label: "See which searches this app ranks for · See plans for keyword research" }, { ...base, variant: "benefit", label: "One app is a weak read on a niche · See plans to compare apps", viewers: 0, clickers: 0, checkoutVisitors: 0, paidVisitors: 0 }];
  const html = renderToStaticMarkup(createElement(Panel, { rows, windowDays: 30 }));
  assert.match(html, /12\.0%/);
  assert.match(html, /6\.0%/);
  assert.match(html, /Clicks \/ eligible visitor/);
  assert.match(html, /See plans for keyword research/);
  assert.match(html, /See plans to compare apps/);
  assert.match(html, /Checkout visitors/);
  assert.match(html, /Paid visitors/);
  assert.equal(html.match(/Immediately after estimates/g)?.length, 2);
  assert.match(html, /headline, explanation and button as a package/);
  assert.doesNotMatch(html, /changes message and position together/);
  assert.match(html, /seven days/);
  assert.match(html, /<option value="\/tools\/app-revenue-checker">Revenue checker/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});
