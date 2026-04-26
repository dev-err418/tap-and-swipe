import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/prisma";
import {
  countryFlag,
  countryLabel,
  pctChange,
  referrerLabel,
} from "@/lib/stats-helpers";
import { resolveRange, DateRangeSchema, type ResolvedRange } from "@/mcp/util/time";

const TopItem = z.object({ label: z.string(), count: z.number() });
type TopItem = z.infer<typeof TopItem>;

interface ProductBaseStats {
  views: { value: number; change: number | null };
  topCountry: TopItem | null;
  topReferrer: TopItem | null;
  range: { from: string; to: string; label: string };
}

async function topByDimension(
  range: ResolvedRange,
  product: string,
  dimension: "country" | "referrer",
): Promise<TopItem | null> {
  if (dimension === "country") {
    const rows = await prisma.$queryRaw<{ country: string | null; cnt: bigint }[]>`
      SELECT country, COUNT(*)::bigint as cnt
      FROM "PageEvent"
      WHERE product = ${product}
        AND type = 'page_view'
        AND "createdAt" >= ${range.start}
        AND "createdAt" < ${range.end}
        AND country IS NOT NULL
      GROUP BY country
      ORDER BY cnt DESC
      LIMIT 1
    `;
    const row = rows[0];
    if (!row?.country) return null;
    const code = row.country.toUpperCase();
    return {
      label: `${countryFlag(code)} ${countryLabel(code)}`,
      count: Number(row.cnt),
    };
  }

  const rows = await prisma.$queryRaw<{ referrer: string | null; cnt: bigint }[]>`
    SELECT referrer, COUNT(*)::bigint as cnt
    FROM "PageEvent"
    WHERE product = ${product}
      AND type = 'page_view'
      AND "createdAt" >= ${range.start}
      AND "createdAt" < ${range.end}
      AND referrer IS NOT NULL
    GROUP BY referrer
    ORDER BY cnt DESC
    LIMIT 20
  `;

  const tally = new Map<string, number>();
  for (const r of rows) {
    if (!r.referrer) continue;
    const label = referrerLabel(r.referrer);
    tally.set(label, (tally.get(label) ?? 0) + Number(r.cnt));
  }
  const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return null;
  return { label: ranked[0][0], count: ranked[0][1] };
}

async function viewMetric(range: ResolvedRange, product: string) {
  const [current, previous] = await Promise.all([
    prisma.pageEvent.count({
      where: {
        product,
        type: "page_view",
        createdAt: { gte: range.start, lt: range.end },
      },
    }),
    prisma.pageEvent.count({
      where: {
        product,
        type: "page_view",
        createdAt: { gte: range.previousStart, lt: range.previousEnd },
      },
    }),
  ]);
  return { value: current, change: pctChange(current, previous) };
}

async function eventMetric(
  range: ResolvedRange,
  product: string,
  type: string,
) {
  const [current, previous] = await Promise.all([
    prisma.pageEvent.count({
      where: {
        product,
        type,
        createdAt: { gte: range.start, lt: range.end },
      },
    }),
    prisma.pageEvent.count({
      where: {
        product,
        type,
        createdAt: { gte: range.previousStart, lt: range.previousEnd },
      },
    }),
  ]);
  return { value: current, change: pctChange(current, previous) };
}

async function productBase(range: ResolvedRange, product: string): Promise<ProductBaseStats> {
  const [views, topCountry, topReferrer] = await Promise.all([
    viewMetric(range, product),
    topByDimension(range, product, "country"),
    topByDimension(range, product, "referrer"),
  ]);

  return {
    views,
    topCountry,
    topReferrer,
    range: {
      from: range.start.toISOString(),
      to: range.end.toISOString(),
      label: range.label,
    },
  };
}

function cr(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function registerSummaryTools(server: McpServer) {
  server.registerTool(
    "newsletter_summary",
    {
      title: "Newsletter summary",
      description:
        "24h-by-default analytics for the homepage newsletter funnel (product='home'). " +
        "Returns page_view count + WoW delta, subscribe count + WoW delta, conversion rate, " +
        "top country, top traffic source. Use days=1 for daily push, days=7 for weekly digest.",
      inputSchema: { dateRange: DateRangeSchema },
      annotations: { readOnlyHint: true },
    },
    async ({ dateRange }) => {
      const range = resolveRange(dateRange);
      const [base, signups] = await Promise.all([
        productBase(range, "home"),
        eventMetric(range, "home", "subscribe"),
      ]);
      const result = {
        product: "newsletter",
        ...base,
        signups,
        cr: cr(signups.value, base.views.value),
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "community_summary",
    {
      title: "Community summary",
      description:
        "Analytics for the community page funnel (product='community'). Returns page_view count + WoW delta, " +
        "cta_clicked, paid count, paid conversion rate (paid/views), top country, top traffic source.",
      inputSchema: { dateRange: DateRangeSchema },
      annotations: { readOnlyHint: true },
    },
    async ({ dateRange }) => {
      const range = resolveRange(dateRange);
      const [base, ctaClicked, paid] = await Promise.all([
        productBase(range, "community"),
        eventMetric(range, "community", "cta_clicked"),
        eventMetric(range, "community", "paid"),
      ]);
      const result = {
        product: "community",
        ...base,
        ctaClicked,
        paid,
        cr: cr(paid.value, base.views.value),
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "quiz_summary",
    {
      title: "Quiz summary",
      description:
        "Analytics for the quiz funnel (product='quiz' + QuizLead table). Returns page_view + WoW delta, " +
        "quiz_start, quiz_complete, completion rate (complete/start), new leads + WoW delta, " +
        "top country, top traffic source, leads-by-route split (coaching vs community).",
      inputSchema: { dateRange: DateRangeSchema },
      annotations: { readOnlyHint: true },
    },
    async ({ dateRange }) => {
      const range = resolveRange(dateRange);
      const [base, starts, completes, leadsCurrent, leadsPrevious, byRoute] =
        await Promise.all([
          productBase(range, "quiz"),
          eventMetric(range, "quiz", "quiz_start"),
          eventMetric(range, "quiz", "quiz_complete"),
          prisma.quizLead.count({
            where: { createdAt: { gte: range.start, lt: range.end } },
          }),
          prisma.quizLead.count({
            where: {
              createdAt: { gte: range.previousStart, lt: range.previousEnd },
            },
          }),
          prisma.quizLead.groupBy({
            by: ["route"],
            where: { createdAt: { gte: range.start, lt: range.end } },
            _count: { _all: true },
          }),
        ]);
      const routes = Object.fromEntries(
        byRoute.map((r) => [r.route, r._count._all]),
      );
      const result = {
        product: "quiz",
        ...base,
        quizStart: starts,
        quizComplete: completes,
        completionRate: cr(completes.value, starts.value),
        leads: {
          value: leadsCurrent,
          change: pctChange(leadsCurrent, leadsPrevious),
        },
        leadsByRoute: {
          coaching: routes.coaching ?? 0,
          community: routes.community ?? 0,
        },
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
