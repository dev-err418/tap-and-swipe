import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/prisma";
import { countryFlag, countryLabel, referrerLabel, PRODUCT_LABELS } from "@/lib/stats-helpers";
import { resolveRange, DateRangeSchema } from "@/mcp/util/time";

const ProductEnum = z.enum([
  "home",
  "community",
  "quiz",
  "coaching",
  "aso",
  "aso-solo",
  "aso-pro",
  "starter",
  "bundle-aso",
  "bundle-community",
]);

const TypeEnum = z.enum([
  "page_view",
  "cta_clicked",
  "stripe_shown",
  "paid",
  "trial_started",
  "quiz_start",
  "quiz_complete",
  "subscribe",
]);

const FUNNEL_ORDER: Record<string, string[]> = {
  home: ["page_view", "subscribe"],
  community: ["page_view", "cta_clicked", "stripe_shown", "paid"],
  quiz: ["page_view", "quiz_start", "quiz_complete"],
  default: ["page_view", "cta_clicked", "stripe_shown", "paid"],
};

export function registerPageEventTools(server: McpServer) {
  server.registerTool(
    "page_events_funnel",
    {
      title: "Page events funnel",
      description:
        "Counts each event type for a product over a date range, in funnel order, with adjacent step conversion rates. " +
        "Funnel order is product-specific: home=[view,subscribe]; community=[view,cta,stripe_shown,paid]; quiz=[view,quiz_start,quiz_complete].",
      inputSchema: {
        product: ProductEnum,
        dateRange: DateRangeSchema,
      },
      annotations: { readOnlyHint: true },
    },
    async ({ product, dateRange }) => {
      const range = resolveRange(dateRange);
      const order = FUNNEL_ORDER[product] ?? FUNNEL_ORDER.default;
      const counts = await prisma.pageEvent.groupBy({
        by: ["type"],
        where: {
          product,
          createdAt: { gte: range.start, lt: range.end },
          type: { in: order },
        },
        _count: { _all: true },
      });
      const byType = Object.fromEntries(
        counts.map((c) => [c.type, c._count._all]),
      );
      const steps = order.map((type, i) => {
        const value = byType[type] ?? 0;
        const prev = i === 0 ? null : (byType[order[i - 1]] ?? 0);
        const conversionFromPrev =
          prev && prev > 0 ? Math.round((value / prev) * 1000) / 10 : null;
        return { type, value, conversionFromPrev };
      });
      const result = {
        product,
        range: { from: range.start.toISOString(), to: range.end.toISOString(), label: range.label },
        steps,
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "page_events_top",
    {
      title: "Page events top-N by dimension",
      description:
        "Top N items for a dimension within a product/type/dateRange window. Dimensions: country, referrer, ref, page (groups by product). " +
        "Country labels include flag emoji; referrer labels are normalized via REFERRER_NAMES.",
      inputSchema: {
        product: ProductEnum.optional(),
        type: TypeEnum.default("page_view"),
        dimension: z.enum(["country", "referrer", "ref", "page"]),
        dateRange: DateRangeSchema,
        limit: z.number().int().min(1).max(20).default(5),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ product, type, dimension, dateRange, limit }) => {
      const range = resolveRange(dateRange);

      if (dimension === "country") {
        const rows = await prisma.$queryRaw<{ country: string; cnt: bigint }[]>`
          SELECT country, COUNT(*)::bigint as cnt
          FROM "PageEvent"
          WHERE type = ${type}
            AND (${product ?? null}::text IS NULL OR product = ${product ?? null})
            AND "createdAt" >= ${range.start}
            AND "createdAt" < ${range.end}
            AND country IS NOT NULL
          GROUP BY country
          ORDER BY cnt DESC
          LIMIT ${limit}::int
        `;
        const items = rows.map((r) => {
          const code = r.country.toUpperCase();
          return {
            label: `${countryFlag(code)} ${countryLabel(code)}`,
            count: Number(r.cnt),
          };
        });
        return { content: [{ type: "text", text: JSON.stringify({ items }, null, 2) }] };
      }

      if (dimension === "referrer") {
        const rows = await prisma.$queryRaw<{ referrer: string; cnt: bigint }[]>`
          SELECT referrer, COUNT(*)::bigint as cnt
          FROM "PageEvent"
          WHERE type = ${type}
            AND (${product ?? null}::text IS NULL OR product = ${product ?? null})
            AND "createdAt" >= ${range.start}
            AND "createdAt" < ${range.end}
            AND referrer IS NOT NULL
          GROUP BY referrer
          ORDER BY cnt DESC
          LIMIT 50
        `;
        const tally = new Map<string, number>();
        for (const r of rows) {
          const label = referrerLabel(r.referrer);
          tally.set(label, (tally.get(label) ?? 0) + Number(r.cnt));
        }
        const items = [...tally.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([label, count]) => ({ label, count }));
        return { content: [{ type: "text", text: JSON.stringify({ items }, null, 2) }] };
      }

      if (dimension === "ref") {
        const rows = await prisma.$queryRaw<{ ref: string; cnt: bigint }[]>`
          SELECT ref, COUNT(*)::bigint as cnt
          FROM "PageEvent"
          WHERE type = ${type}
            AND (${product ?? null}::text IS NULL OR product = ${product ?? null})
            AND "createdAt" >= ${range.start}
            AND "createdAt" < ${range.end}
            AND ref IS NOT NULL
          GROUP BY ref
          ORDER BY cnt DESC
          LIMIT ${limit}::int
        `;
        const items = rows.map((r) => ({ label: r.ref, count: Number(r.cnt) }));
        return { content: [{ type: "text", text: JSON.stringify({ items }, null, 2) }] };
      }

      // page = group by product
      const rows = await prisma.pageEvent.groupBy({
        by: ["product"],
        where: { type, createdAt: { gte: range.start, lt: range.end } },
        _count: { _all: true },
        orderBy: { _count: { product: "desc" } },
        take: limit,
      });
      const items = rows.map((r) => ({
        label: PRODUCT_LABELS[r.product] ?? `/${r.product}`,
        count: r._count._all,
      }));
      return { content: [{ type: "text", text: JSON.stringify({ items }, null, 2) }] };
    },
  );

  server.registerTool(
    "page_events_recent",
    {
      title: "Page events recent",
      description:
        "Returns recent PageEvent rows (sanitized — no stripeCustomerId). Capped at 100. Useful for ad-hoc inspection.",
      inputSchema: {
        product: ProductEnum.optional(),
        type: TypeEnum.optional(),
        limit: z.number().int().min(1).max(100).default(50),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ product, type, limit }) => {
      const rows = await prisma.pageEvent.findMany({
        where: { product, type },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          product: true,
          type: true,
          country: true,
          referrer: true,
          ref: true,
          revenue: true,
          currency: true,
          createdAt: true,
        },
      });
      return { content: [{ type: "text", text: JSON.stringify({ rows }, null, 2) }] };
    },
  );
}
