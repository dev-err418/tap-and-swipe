import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { AppSprintFunnelAnalytics } from "../../lib/appsprint-funnel";
import { loadTestModule } from "./helpers/load-test-module";

const nothing = () => null;
const Panel = loadTestModule<{ default(props: { analytics: AppSprintFunnelAnalytics; showPricingExperiment: boolean; showHeroExperiment: boolean }): ReactNode }>("components/analytics/AppSprintFunnelPanel.tsx", {
  "@/components/analytics/AppSprintFunnelCharts": { VisitorsRevenueChart: nothing },
  "@/components/analytics/DashboardCard": { DashboardCard: ({ title, titleAccessory, action, children }: { title: ReactNode; titleAccessory: ReactNode; action: ReactNode; children: ReactNode }) => createElement("section", null, title, titleAccessory, action, children) },
  "@/components/analytics/ExperimentStats": { __esModule: true, default: () => createElement("p", null, "Win probabilities"), ExperimentWarningBadge: nothing },
  "@/lib/experiment-stats": { analyzeExperiment: () => ({ sufficientData: true }) },
  "@/components/analytics/dashboard-surface": {},
  "@/components/analytics/DashboardCardMetricPicker": { DashboardCardMetricPicker: nothing },
  "@/lib/utils": { cn: (...values: unknown[]) => values.filter(Boolean).join(" ") },
  "@/components/analytics/MarketingCtaExperiment": { __esModule: true, default: nothing },
  "@/components/ui/dialog": { Dialog: nothing, DialogContent: nothing, DialogDescription: nothing, DialogHeader: nothing, DialogTitle: nothing },
}).default;

type PricingRow = NonNullable<AppSprintFunnelAnalytics["pricingExperiment"]>[number];
const row = (variant: string, label: string, currency: string): PricingRow => ({ variant, label, currency, visitors: 100, paymentPageViews: 10, trials: 0, paid: 2, revenue: 216 });
const activeRows = [row("annual_108", "$108/year · VAT extra · includes prior test", "USD"), row("annual_108_eur", "€108/year · VAT extra", "EUR")];

function render(pricingExperiment: PricingRow[]) {
  const analytics: AppSprintFunnelAnalytics = {
    generatedAt: "2026-10-05T12:00:00Z", windowDays: 30,
    totals: { appsprintVisits: 0, asoVisits: 200, bookCallClicks: 0, bookCallStarted: 0, asoCheckouts: 20, asoTrials: 0, asoPaid: 4 },
    byChannel: [], byCountry: [], byReferrer: [], daily: [], recentConversions: [], heroPreviewExperiment: [], pricingExperiment,
  };
  return renderToStaticMarkup(createElement(Panel, { analytics, showPricingExperiment: true, showHeroExperiment: false }));
}

test("AppSprint pricing shows two offers, a 50/50 allocation, and each billing currency", () => {
  const html = render(activeRows);
  assert.match(html, /Pricing A\/B test/);
  assert.match(html, /50% \$108 \/ 50% €108 · Cumulative/);
  assert.match(html, /Prior \$108\/year data included/);
  assert.match(html, /Variant A/);
  assert.match(html, /Variant B/);
  assert.match(html, /\$216\.00/);
  assert.match(html, /€216\.00/);
  assert.doesNotMatch(html, /Variant C|A\/B\/C|Win probabilities|NaN|Infinity/);
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
  assert.match(html, /Win probabilities/);
  assert.match(html, /Last 30 days/);
  assert.doesNotMatch(html, /50%|Prior \$108/);
});
