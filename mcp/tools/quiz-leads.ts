import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/prisma";
import { resolveRange, DateRangeSchema } from "@/mcp/util/time";
import { maskEmail, maskName } from "@/mcp/util/pii";

export function registerQuizLeadTools(server: McpServer) {
  server.registerTool(
    "quiz_leads_summary",
    {
      title: "Quiz leads summary",
      description:
        "Segment counts for QuizLead within a date range: hasApp (revenue/no-revenue/no), businessType, budget, route. Plus total count.",
      inputSchema: { dateRange: DateRangeSchema },
      annotations: { readOnlyHint: true },
    },
    async ({ dateRange }) => {
      const range = resolveRange(dateRange);
      const where = { createdAt: { gte: range.start, lt: range.end } };
      const [total, hasApp, businessType, budget, route] = await Promise.all([
        prisma.quizLead.count({ where }),
        prisma.quizLead.groupBy({
          by: ["hasApp"],
          where,
          _count: { _all: true },
        }),
        prisma.quizLead.groupBy({
          by: ["businessType"],
          where,
          _count: { _all: true },
        }),
        prisma.quizLead.groupBy({
          by: ["budget"],
          where,
          _count: { _all: true },
        }),
        prisma.quizLead.groupBy({
          by: ["route"],
          where,
          _count: { _all: true },
        }),
      ]);

      const result = {
        range: { from: range.start.toISOString(), to: range.end.toISOString(), label: range.label },
        total,
        hasApp: Object.fromEntries(hasApp.map((r) => [r.hasApp, r._count._all])),
        businessType: Object.fromEntries(
          businessType.map((r) => [r.businessType ?? "unknown", r._count._all]),
        ),
        budget: Object.fromEntries(
          budget.map((r) => [r.budget ?? "unknown", r._count._all]),
        ),
        route: Object.fromEntries(route.map((r) => [r.route, r._count._all])),
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "quiz_leads_recent",
    {
      title: "Quiz leads recent",
      description:
        "Recent QuizLead rows. Email and firstName are masked unless reveal=true. Capped at 100.",
      inputSchema: {
        limit: z.number().int().min(1).max(100).default(20),
        reveal: z.boolean().default(false),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ limit, reveal }) => {
      const rows = await prisma.quizLead.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      const sanitized = rows.map((r) => ({
        id: r.id,
        firstName: reveal ? r.firstName : maskName(r.firstName),
        email: reveal ? r.email : maskEmail(r.email),
        hasApp: r.hasApp,
        challenge: r.challenge,
        businessType: r.businessType,
        budget: r.budget,
        route: r.route,
        ref: r.ref,
        country: r.country,
        createdAt: r.createdAt,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify({ rows: sanitized, masked: !reveal }, null, 2) }],
      };
    },
  );
}
