import assert from "node:assert/strict";
import test from "node:test";
import { createElement, Fragment, isValidElement, Suspense, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getAnalyticsAccess } from "../../lib/analytics-access";
import * as accessHelpers from "../../lib/analytics-access";
import * as platformHelpers from "../../lib/versy-analytics-platform";
import { activeWebsiteABTestCount } from "../../lib/website-ab-tests";
import { AnalyticsDirectorySkeleton } from "../../components/analytics/AnalyticsDirectorySkeleton";
import { loadTestModule } from "./helpers/load-test-module";

type Props = { children?: ReactNode; [key: string]: unknown };
type PageParams = { app?: string; site?: string; tab?: string; period?: string; platform?: string };
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

function pageFixture(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const dependencies: Record<string, unknown> = {
    "@/lib/analytics-session": { getAnalyticsViewer: async () => alberto },
    "@/lib/analytics-access": accessHelpers,
    "@/lib/versy-analytics-platform": platformHelpers,
    "@/lib/versy-meta-roas-server": { getVersyMetaRoas: forbiddenData },
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
        return { id: "poky", name: "Poky", downloads: 25, revenueCents: 12000, trend: [], iconUrl: "/poky.png", snapshotUpdatedAt: "2026-10-12T10:00:00Z" };
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
    "analytics/RealizedAppu", "analytics/AppOverviewPanel", "analytics/GlowProductPanel", "analytics/AnalyticsPeriodSelect",
    "analytics/DeadProjectsDisclosure", "analytics/AppSprintFunnelPanel", "aso-debug/LicensesModal",
    "aso-debug/ProxyAnalyticsPanel", "aso-debug/ProxyHealthPanel", "aso-debug/LicenseUsagePanel",
    "aso-debug/FeedbackPanel", "aso-debug/TrialAbusePanel",
  ]) dependencies[`@/components/${component}`] = { __esModule: true, default: passthrough };
  return { page: loadTestModule<Page>("app/analytics/page.tsx", { ...dependencies, ...overrides }).default, calls };
}

test("Alberto's rendered directory greets him and totals only Poky", async () => {
  const f = pageFixture();
  const tree = await f.page({ searchParams: Promise.resolve({}) });
  const html = renderToStaticMarkup(await resolveServerComponents(tree));
  assert.match(html, /Hey alberto/);
  assert.match(html, /25 downloads/);
  assert.match(html, /\$120/);
  assert.match(html, /Poky/);
  assert.doesNotMatch(html, /updated|Refreshes every 30 min/i);
  assert.doesNotMatch(html, /Arthur|Glow|Versy|All websites|tab=appsprint/);
  assert.ok(f.calls.length > 0);
  assert.ok(f.calls.every((id) => id === "poky"));
});

test("Versy defaults to iOS and Both shows the two platform reports with one filter", async () => {
  const seen: string[] = [];
  const f = pageFixture({
    "@/lib/analytics-session": { getAnalyticsViewer: async () => getAnalyticsAccess(null, { development: true }) },
    "@/lib/versy-meta-roas-server": { getVersyMetaRoas: async () => ({ status: "empty" }) },
    "@/lib/mobile-app-analytics": { getMobileAppById: async (period: string, appId: string, options: { platform: string }) => {
      seen.push(`${appId}:${period}:${options.platform}`);
      return { id: "versy", name: "Versy", trend: [], iconUrl: "/versy.png" };
    } },
    "@/components/analytics/AnalyticsPeriodSelect": { __esModule: true, default: ({ period, platform }: Props) =>
      createElement("div", { "data-period": period, "data-platform-filter": platform }) },
    "@/components/analytics/AppOverviewPanel": { __esModule: true, default: ({ headerStart, headerEnd }: Props) =>
      createElement(Fragment, null, headerStart as ReactNode, headerEnd as ReactNode) },
  });
  const html = async (params: PageParams) => renderToStaticMarkup(await resolveServerComponents(
    await f.page({ searchParams: Promise.resolve(params) })));
  const ios = await html({ app: "versy", period: "day" });
  assert.match(ios, /data-period="day" data-platform-filter="ios"/);
  const android = await html({ app: "versy", period: "day", platform: "android" });
  assert.match(android, /data-period="day" data-platform-filter="android"/);
  assert.deepEqual(seen.splice(0), ["versy:day:ios", "versy:month:ios", "versy:day:android", "versy:month:android"]);

  const both = await html({ app: "versy", period: "day", platform: "both" });
  assert.match(both, /data-period="day" data-platform-filter="both"/);
  assert.equal(both.match(/data-platform-filter/g)?.length, 1);
  assert.match(both, /<h2[^>]*>iOS<\/h2>/);
  assert.match(both, /<h2[^>]*>Android<\/h2>/);
  assert.deepEqual(seen.sort(), ["versy:day:android", "versy:day:ios", "versy:month:android", "versy:month:ios"]);
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


test("the selected app period renders without waiting for its monthly country comparison", async () => {
  let finishMonth!: (value: object) => void;
  const month = new Promise<object>((resolve) => { finishMonth = resolve; });
  let comparison: Promise<unknown> | undefined;
  const f = pageFixture({
    "@/lib/mobile-app-analytics": { getMobileAppById: async (period: string) => period === "month" ? month : {
      id: "poky", name: "Poky", downloads: 25, revenueCents: 10000, trend: [], iconUrl: "/poky.png", snapshotUpdatedAt: "2026-11-02T07:00:00Z",
    } },
    "@/components/analytics/AppOverviewPanel": { __esModule: true, default: (props: Props) => {
      comparison = props.countryBreakdownPromise as Promise<unknown>;
      return props.headerStart;
    } },
  });
  const tree = await f.page({ searchParams: Promise.resolve({ app: "poky" }) });
  let timer: ReturnType<typeof setTimeout>;
  try {
    const resolved = await Promise.race([resolveServerComponents(tree), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Chart was blocked by monthly data")), 1000);
    })]);
    assert.match(renderToStaticMarkup(resolved), /Poky/);
    assert.ok(comparison);
    finishMonth({ dataCountries: [], cohortDataAvailable: true });
    assert.deepEqual(JSON.parse(JSON.stringify(await comparison)), { countries: [], available: true, windowLabel: "Last 30 days" });
  } finally { clearTimeout(timer!); finishMonth({}); }
});
