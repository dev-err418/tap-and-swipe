import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AppSprintFunnelAnalytics } from "../../lib/appsprint-funnel";
import { loadTestModule } from "./helpers/load-test-module";
import * as experimentStats from "../../lib/experiment-stats";

const nothing = () => null;
const utils = { cn: (...values: unknown[]) => values.filter(Boolean).join(" ") };
const statsComponents = loadTestModule("components/analytics/ExperimentStats.tsx", { "@/lib/utils": utils });
const Panel = loadTestModule<{ default(props: { analytics: AppSprintFunnelAnalytics; showPricingExperiment: boolean; showHeroExperiment: boolean }): ReactNode }>("components/analytics/AppSprintFunnelPanel.tsx", {
  "@/components/analytics/AppSprintFunnelCharts": { VisitorsRevenueChart: nothing },
  "@/components/analytics/DashboardCard": { DashboardCard: ({ title, titleAccessory, action, children }: { title: ReactNode; titleAccessory: ReactNode; action: ReactNode; children: ReactNode }) => createElement("section", null, title, titleAccessory, action, children) },
  "@/components/analytics/ExperimentStats": statsComponents,
  "@/lib/experiment-stats": experimentStats,
  "@/components/analytics/dashboard-surface": {},
  "@/components/analytics/DashboardCardMetricPicker": { DashboardCardMetricPicker: nothing },
  "@/lib/utils": utils,
  "@/components/analytics/MarketingCtaExperiment": { __esModule: true, default: nothing },
  "@/components/ui/dialog": { Dialog: nothing, DialogContent: nothing, DialogDescription: nothing, DialogHeader: nothing, DialogTitle: nothing },
}).default;

type PricingRow = NonNullable<AppSprintFunnelAnalytics["pricingExperiment"]>[number];
const row = (variant: string, label: string, currency: string): PricingRow => ({ variant, label, currency, visitors: 100, paymentPageViews: 10, trials: 0, paid: 2, revenue: 216 });
const activeRows = [row("annual_108", "$108/year · VAT extra · includes prior test", "USD"), row("annual_108_eur", "€108/year · VAT extra", "EUR")];

function render(pricingExperiment: PricingRow[], pricingPageUpdate?: AppSprintFunnelAnalytics["pricingPageUpdate"], generatedAt = "2026-10-05T12:00:00Z", showPricingExperiment = true) {
  const analytics: AppSprintFunnelAnalytics = {
    generatedAt, windowDays: 30,
    totals: { appsprintVisits: 0, asoVisits: 200, bookCallClicks: 0, bookCallStarted: 0, asoCheckouts: 20, asoTrials: 0, asoPaid: 4 },
    byChannel: [], byCountry: [], byReferrer: [], daily: [], recentConversions: [], heroPreviewExperiment: [], pricingExperiment, pricingPageUpdate,
  };
  return renderToStaticMarkup(createElement(Panel, { analytics, showPricingExperiment, showHeroExperiment: false }));
}

test("AppSprint analytics hides the retired pricing comparison and page update", () => {
  const html = render(activeRows, {
    cutoffAt: "2026-10-14T22:00:00.000Z",
    before: activeRows,
    after: activeRows,
  }, "2026-10-16T12:00:00Z", false);
  assert.doesNotMatch(html, /Pricing A\/B test|October 15 page update|50% \$108/);
});

test("AppSprint pricing shows two offers, a 50/50 allocation, and each billing currency", () => {
  const html = render(activeRows);
  assert.match(html, /Pricing A\/B test/);
  assert.match(html, /50% \$108 \/ 50% €108 · Cumulative/);
  assert.match(html, /Prior \$108\/year data included/);
  assert.match(html, /Variant A/);
  assert.match(html, /Variant B/);
  assert.match(html, /\$216\.00/);
  assert.match(html, /€216\.00/);
  assert.match(html, /Paid conversion rate/);
  assert.equal((html.match(/chance to win/g) ?? []).length, 2);
  assert.match(html, /Directional comparison/);
  assert.match(html, /do not establish a winner for the current test/);
  assert.doesNotMatch(html, /Variant C|A\/B\/C|Decisive|Projected:|participant target|NaN|Infinity/);
});

test("older three-arm responses cannot put retired C back into the pricing table", () => {
  const html = render([...activeRows, row("annual_144_usd_vat", "$144/year · VAT included", "USD")]);
  assert.doesNotMatch(html, /\$144|Variant C|30%|40%/);
  assert.equal((html.match(/Variant [AB]/g) ?? []).length, 2);
});

test("standalone Community pricing keeps its offers and experiment analysis", () => {
  const html = render([row("control", "Community control", "USD"), row("yearly", "Community yearly", "USD")]);
  assert.match(html, /Community control/);
  assert.match(html, /Community yearly/);
  assert.match(html, /chance to win/);
  assert.match(html, /Collecting data/);
  assert.match(html, /Last 30 days/);
  assert.doesNotMatch(html, /50% \$108|Prior \$108|Directional comparison/);
});

test("pricing bars use paid conversion rather than comparing different currency amounts", () => {
  const html = render([
    { ...activeRows[0], visitors: 1000, paid: 50, revenue: 10000 },
    { ...activeRows[1], visitors: 1000, paid: 100, revenue: 1 },
  ]);
  assert.match(html, /\+100% vs control/);
  assert.match(html, /background-color:#1d4ed8/);
  assert.doesNotMatch(html, /Decisive|participant target|NaN|Infinity/);
});

test("pricing offers with no visitors keep the comparison visible without invalid values", () => {
  const html = render(activeRows.map((offer) => ({ ...offer, visitors: 0, paymentPageViews: 0, paid: 0, revenue: 0 })));
  assert.equal((html.match(/chance to win/g) ?? []).length, 2);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("October 15 comparison shows both periods for each currency with empty after data", () => {
  const before = [
    { ...activeRows[0], visitors: 1566, paymentPageViews: 111, paid: 17, revenue: 1836 },
    { ...activeRows[1], visitors: 607, paymentPageViews: 36, paid: 4, revenue: 432 },
  ];
  const after = activeRows.map((offer) => ({ ...offer, visitors: 0, paymentPageViews: 0, paid: 0, revenue: 0 }));
  const html = render(activeRows, { cutoffAt: "2026-10-14T22:00:00.000Z", before, after });
  assert.match(html, /October 15 page update/);
  assert.match(html, /15 Oct 2026 · Paris time/);
  assert.match(html, /After starts on 15 October/);
  assert.equal((html.match(/>Before</g) ?? []).length, 2);
  assert.equal((html.match(/>After</g) ?? []).length, 2);
  assert.match(html, /1,566/);
  assert.match(html, /€432\.00/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test("October 15 comparison displays new visitor and paid results after the update", () => {
  const html = render(activeRows, {
    cutoffAt: "2026-10-14T22:00:00.000Z",
    before: activeRows,
    after: [
      { ...activeRows[0], visitors: 40, paymentPageViews: 6, paid: 2, revenue: 216 },
      { ...activeRows[1], visitors: 20, paymentPageViews: 4, paid: 1, revenue: 108 },
    ],
  }, "2026-10-16T12:00:00Z");
  assert.match(html, /Compare visitors who saw the pricing page before and from 15 October onward/);
  assert.match(html, /5\.00%/);
  assert.match(html, /€108\.00/);
  assert.doesNotMatch(html, /After starts on 15 October|NaN|Infinity/);
});
