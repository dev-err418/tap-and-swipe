import assert from "node:assert/strict";
import test from "node:test";
import { createElement, Fragment, isValidElement, Suspense, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getAnalyticsAccess } from "../../lib/analytics-access";
import * as accessHelpers from "../../lib/analytics-access";
import { activeWebsiteABTestCount } from "../../lib/website-ab-tests";
import { AnalyticsDirectorySkeleton } from "../../components/analytics/AnalyticsDirectorySkeleton";
import { loadTestModule } from "./helpers/load-test-module";

type Props = { children?: ReactNode; [key: string]: unknown };
type PageParams = { app?: string; site?: string; tab?: string; period?: string };
type Page = { default(props: { searchParams: Promise<PageParams> }): Promise<ReactNode> };
const alberto = getAnalyticsAccess("643841344103776318", { development: false })!;
const passthrough = ({ children }: Props) => children ?? null;
const forbiddenData = () => { throw new Error("Attempted to fetch another project's data"); };

async function resolveServerComponents(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) {
    return Promise.all(node.map(async (child, index) =>
      createElement(Fragment, { key: index }, await resolveServerComponents(child))));
  }
  if (!isValidElement<Props>(node)) return node;
  if (node.type === Suspense) {
    return createElement(Fragment, { key: node.key }, await resolveServerComponents(node.props.children));
  }
  if (typeof node.type === "function") {
    const component = node.type as (props: Props) => ReactNode | Promise<ReactNode>;
    return resolveServerComponents(await component(node.props));
  }
  const children = await resolveServerComponents(node.props.children);
  return createElement(node.type, { ...node.props, key: node.key }, children);
}

function pageFixture() {
  const calls: string[] = [];
  const dependencies: Record<string, unknown> = {
    "@/lib/analytics-session": { getAnalyticsViewer: async () => alberto },
    "@/lib/analytics-access": accessHelpers,
    "next/navigation": { redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error("not-found"); } },
    "next/link": { __esModule: true, default: (props: Props) => createElement("a", props, props.children) },
    "lucide-react": { ArrowLeft: passthrough, Command: passthrough },
    "@/lib/appsprint-funnel": { getAppSprintFunnelAnalytics: forbiddenData },
    "@/lib/postback-funnel": { getPostbackFunnelAnalytics: forbiddenData },
    "@/lib/grew-it-funnel": { getGrewItFunnelAnalytics: forbiddenData },
    "@/lib/community-funnel": { getCommunityFunnelAnalytics: forbiddenData },
    "@/lib/glow-product-queries": { getGlowProductReport: forbiddenData },
    "@/lib/versy-product-queries": { getVersyProductReport: forbiddenData },
    "@/lib/mobile-app-analytics": {
      getMobileAppSummary: async (_period: string, appId: string) => {
        calls.push(appId);
        assert.equal(appId, "poky");
        return { id: "poky", name: "Poky", downloads: 25, revenueCents: 12000, trend: [], iconUrl: "/poky.png" };
      },
      getMobileAppById: forbiddenData,
    },
    "@/lib/app-experiment-map": { activeABTestCount: () => 0 },
    "@/lib/website-ab-tests": { activeWebsiteABTestCount },
    "@/components/analytics/dashboard-surface": { DASHBOARD_SURFACE_CLASS: "" },
    "@/components/analytics/website-summary-card": { formatCompactRevenue: String, ProjectExperimentBadge: passthrough, WebsiteFavicon: passthrough, WebsiteMiniChart: passthrough, WebsiteSummaryCard: passthrough },
    "@/components/analytics/AnalyticsDirectorySkeleton": { AnalyticsDirectorySkeleton, AppCardSkeleton: passthrough, AppTotalsSkeleton: passthrough, WebsiteCardSkeleton: passthrough, WebsiteTotalsSkeleton: passthrough },
    "@/components/analytics/AnalyticsDetailSkeleton": { AnalyticsDetailSkeleton: passthrough },
  };
  for (const component of [
    "analytics/AppOverviewPanel", "analytics/GlowProductPanel", "analytics/AnalyticsPeriodSelect",
    "analytics/DeadProjectsDisclosure", "analytics/AppSprintFunnelPanel", "aso-debug/LicensesModal",
    "aso-debug/ProxyAnalyticsPanel", "aso-debug/ProxyHealthPanel", "aso-debug/LicenseUsagePanel",
    "aso-debug/FeedbackPanel", "aso-debug/TrialAbusePanel",
  ]) dependencies[`@/components/${component}`] = { __esModule: true, default: passthrough };
  return { page: loadTestModule<Page>("app/analytics/page.tsx", dependencies).default, calls };
}

test("Alberto's rendered directory greets him and totals only Poky", async () => {
  const f = pageFixture();
  const tree = await f.page({ searchParams: Promise.resolve({}) });
  const html = renderToStaticMarkup(await resolveServerComponents(tree));
  assert.match(html, /Hey alberto/);
  assert.match(html, /25 downloads/);
  assert.match(html, /\$120/);
  assert.match(html, /Poky/);
  assert.doesNotMatch(html, /Arthur|Glow|Versy|All websites|tab=appsprint/);
  assert.ok(f.calls.length > 0);
  assert.ok(f.calls.every((id) => id === "poky"));
});

test("direct URLs for other projects are rejected before rendering or fetching data", async () => {
  for (const params of [{ app: "glow" }, { app: "versy" }, { site: "appsprint" }, { app: "poky", site: "community" }, { tab: "appsprint" }, { tab: "aso" }]) {
    const f = pageFixture();
    await assert.rejects(f.page({ searchParams: Promise.resolve(params) }), /not-found/);
    assert.deepEqual(f.calls, []);
  }
});

test("Alberto's loading directory shows his greeting and only the Poky card", () => {
  const html = renderToStaticMarkup(createElement(AnalyticsDirectorySkeleton, { periodLabel: "last week", access: alberto }));
  assert.match(html, /Hey alberto/);
  assert.match(html, /Poky/);
  assert.doesNotMatch(html, /Arthur|Glow|Versy|appsprint\.app|community|Loading websites/);
});
