import { NextResponse } from "next/server";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

// ── Auth ────────────────────────────────────────────────────────────────
function isAuthorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token === process.env.MOBILE_API_KEY;
}

// ── Helpers ─────────────────────────────────────────────────────────────
interface Metric {
  value: number;
  change: number | null;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ── Whop MRR ────────────────────────────────────────────────────────────
async function fetchWhopMrr(apiKey: string): Promise<number> {
  // 1. Fetch all plans → build plan_id → monthly price map
  const planPrices = new Map<string, number>();

  let planPage = 1;
  let hasMorePlans = true;
  while (hasMorePlans) {
    const res = await fetch(
      `https://api.whop.com/api/v2/plans?per_page=50&page=${planPage}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) throw new Error(`Whop plans API: ${res.status}`);
    const body = await res.json();
    const plans = body.data ?? body;

    for (const plan of Array.isArray(plans) ? plans : []) {
      const id = plan.id as string;
      const renewalAmount = Number(plan.renewal_price ?? plan.initial_price ?? 0);
      const billingPeriod = Number(plan.billing_period ?? 30);
      // Normalize to monthly (prices in USD)
      const monthly = billingPeriod > 0 ? (renewalAmount / billingPeriod) * 30 : 0;
      planPrices.set(id, monthly);
    }

    const pagination = body.pagination;
    hasMorePlans =
      pagination && pagination.current_page < pagination.total_page;
    planPage++;
  }

  // 2. Fetch all active memberships → sum MRR
  let mrr = 0;
  let memberPage = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await fetch(
      `https://api.whop.com/api/v2/memberships?valid=true&per_page=50&page=${memberPage}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) throw new Error(`Whop memberships API: ${res.status}`);
    const body = await res.json();
    const memberships = body.data ?? body;

    for (const m of Array.isArray(memberships) ? memberships : []) {
      const planId = m.plan as string;
      mrr += planPrices.get(planId) ?? 0;
    }

    const pagination = body.pagination;
    hasMore =
      pagination && pagination.current_page < pagination.total_page;
    memberPage++;
  }

  return Math.round(mrr * 100) / 100;
}

// ── Listmonk subscribers ────────────────────────────────────────────────
async function fetchSubscriberCount(): Promise<number> {
  const url = process.env.LISTMONK_URL;
  const user = process.env.LISTMONK_API_USER;
  const pass = process.env.LISTMONK_API_PASSWORD;
  const listUuid = process.env.LISTMONK_LIST_UUID;

  if (!url || !user || !pass || !listUuid) {
    throw new Error("Missing Listmonk env vars");
  }

  const res = await fetch(`${url}/api/lists`, {
    headers: {
      Authorization: `Basic ${btoa(`${user}:${pass}`)}`,
    },
  });
  if (!res.ok) throw new Error(`Listmonk API: ${res.status}`);
  const body = await res.json();
  const lists = body.data?.results ?? [];

  const list = lists.find(
    (l: { uuid: string }) => l.uuid === listUuid
  );
  return list?.subscriber_count ?? 0;
}

// ── GA4 helpers ─────────────────────────────────────────────────────────
function getGA4Client() {
  const base64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;
  const json = Buffer.from(base64, "base64").toString("utf-8");
  const credentials = JSON.parse(json);
  return new BetaAnalyticsDataClient({ credentials });
}

async function fetchWebTraffic(): Promise<Metric> {
  const propertyId = process.env.GA4_PROPERTY_ID_WEBSITE;
  if (!propertyId) throw new Error("Missing GA4_PROPERTY_ID_WEBSITE");

  const client = getGA4Client();
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: dateStr(7), endDate: dateStr(1) },
      { startDate: dateStr(14), endDate: dateStr(8) },
    ],
    metrics: [{ name: "sessions" }],
  });

  let current = 0;
  let previous = 0;
  for (const row of response.rows ?? []) {
    const dateRange = row.dimensionValues?.[0]?.value ?? "date_range_0";
    const val = parseInt(row.metricValues?.[0]?.value ?? "0", 10);
    if (dateRange === "date_range_0") current = val;
    else if (dateRange === "date_range_1") previous = val;
  }

  return { value: current, change: pctChange(current, previous) };
}

interface NewsletterStats {
  topCountries: string[];
  visits: Metric;
  conversions: Metric;
  cr: Metric;
}

async function fetchNewsletterStats(): Promise<NewsletterStats> {
  const propertyId = process.env.GA4_PROPERTY_ID_WEBSITE;
  if (!propertyId) throw new Error("Missing GA4_PROPERTY_ID_WEBSITE");

  const client = getGA4Client();

  // Fetch top countries from newsletter_subscribe events
  const [countriesRes] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: dateStr(7), endDate: dateStr(1) }],
    dimensions: [{ name: "country" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { value: "newsletter_subscribe" },
      },
    },
    orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
    limit: 3,
  });

  const topCountries = (countriesRes.rows ?? [])
    .map((row) => row.dimensionValues?.[0]?.value ?? "")
    .filter((c) => c.length > 0);

  // Fetch homepage visits (current vs previous week)
  const [visitsRes] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: dateStr(7), endDate: dateStr(1) },
      { startDate: dateStr(14), endDate: dateStr(8) },
    ],
    metrics: [{ name: "screenPageViews" }],
    dimensionFilter: {
      filter: {
        fieldName: "pagePath",
        stringFilter: { matchType: "EXACT", value: "/" },
      },
    },
  });

  let visitsCurrent = 0;
  let visitsPrevious = 0;
  for (const row of visitsRes.rows ?? []) {
    const dr = row.dimensionValues?.[0]?.value ?? "date_range_0";
    const val = parseInt(row.metricValues?.[0]?.value ?? "0", 10);
    if (dr === "date_range_0") visitsCurrent = val;
    else if (dr === "date_range_1") visitsPrevious = val;
  }

  // Fetch newsletter_subscribe event count (current vs previous week)
  const [conversionsRes] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: dateStr(7), endDate: dateStr(1) },
      { startDate: dateStr(14), endDate: dateStr(8) },
    ],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { value: "newsletter_subscribe" },
      },
    },
  });

  let convCurrent = 0;
  let convPrevious = 0;
  for (const row of conversionsRes.rows ?? []) {
    const dr = row.dimensionValues?.[0]?.value ?? "date_range_0";
    const val = parseInt(row.metricValues?.[0]?.value ?? "0", 10);
    if (dr === "date_range_0") convCurrent = val;
    else if (dr === "date_range_1") convPrevious = val;
  }

  const crCurrent =
    visitsCurrent > 0
      ? Math.round((convCurrent / visitsCurrent) * 1000) / 10
      : 0;
  const crPrevious =
    visitsPrevious > 0
      ? Math.round((convPrevious / visitsPrevious) * 1000) / 10
      : 0;

  return {
    topCountries,
    visits: {
      value: visitsCurrent,
      change: pctChange(visitsCurrent, visitsPrevious),
    },
    conversions: {
      value: convCurrent,
      change: pctChange(convCurrent, convPrevious),
    },
    cr: { value: crCurrent, change: pctChange(crCurrent, crPrevious) },
  };
}

// ── Route handler ───────────────────────────────────────────────────────
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [asoResult, commuResult, subsResult, trafficResult, newsletterResult] =
    await Promise.allSettled([
      fetchWhopMrr(process.env.WHOP_ASO_API_KEY!),
      fetchWhopMrr(process.env.WHOP_COMMUNITY_API_KEY!),
      fetchSubscriberCount(),
      fetchWebTraffic(),
      fetchNewsletterStats(),
    ]);

  const asoMrr =
    asoResult.status === "fulfilled" ? asoResult.value : 0;
  const commuMrr =
    commuResult.status === "fulfilled" ? commuResult.value : 0;
  const subs =
    subsResult.status === "fulfilled" ? subsResult.value : 0;
  const webTraffic: Metric =
    trafficResult.status === "fulfilled"
      ? trafficResult.value
      : { value: 0, change: null };
  const newsletter: NewsletterStats =
    newsletterResult.status === "fulfilled"
      ? newsletterResult.value
      : {
          topCountries: [],
          visits: { value: 0, change: null },
          conversions: { value: 0, change: null },
          cr: { value: 0, change: null },
        };

  // Log any errors for debugging
  for (const [name, result] of [
    ["asoMrr", asoResult],
    ["commuMrr", commuResult],
    ["subs", subsResult],
    ["webTraffic", trafficResult],
    ["newsletter", newsletterResult],
  ] as const) {
    if (result.status === "rejected") {
      console.error(`[mobile/stats] ${name} failed:`, result.reason);
    }
  }

  return NextResponse.json({
    asoMrr: { value: asoMrr, change: null },
    commuMrr: { value: commuMrr, change: null },
    subs: { value: subs, change: null },
    webTraffic,
    newsletter,
  });
}
