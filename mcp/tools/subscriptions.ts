import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/prisma";
import { resolveRange, DateRangeSchema } from "@/mcp/util/time";
import { maskEmail, maskDiscordId } from "@/mcp/util/pii";

export function registerSubscriptionTools(server: McpServer) {
  server.registerTool(
    "subscription_summary",
    {
      title: "Subscription summary",
      description:
        "Counts of users grouped by tier and subscriptionStatus. Subs are all on Whop after the Paddle removal — anomalies in paymentProvider show up here.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    async () => {
      const [byTier, byStatus, byProvider, totalUsers, withSubs] = await Promise.all([
        prisma.user.groupBy({ by: ["tier"], _count: { _all: true } }),
        prisma.user.groupBy({ by: ["subscriptionStatus"], _count: { _all: true } }),
        prisma.user.groupBy({ by: ["paymentProvider"], _count: { _all: true } }),
        prisma.user.count(),
        prisma.user.count({ where: { subscriptionId: { not: null } } }),
      ]);
      const result = {
        totalUsers,
        usersWithSubscriptions: withSubs,
        byTier: Object.fromEntries(byTier.map((r) => [r.tier ?? "(none)", r._count._all])),
        byStatus: Object.fromEntries(
          byStatus.map((r) => [r.subscriptionStatus ?? "(none)", r._count._all]),
        ),
        byProvider: Object.fromEntries(
          byProvider.map((r) => [r.paymentProvider ?? "(none)", r._count._all]),
        ),
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "users_growth",
    {
      title: "Users growth",
      description:
        "Signup counts (User.createdAt) bucketed by day or week within a date range.",
      inputSchema: {
        dateRange: DateRangeSchema,
        granularity: z.enum(["day", "week"]).default("day"),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ dateRange, granularity }) => {
      const range = resolveRange(dateRange);
      const bucket = granularity === "day" ? "day" : "week";
      const rows = await prisma.$queryRaw<{ bucket: Date; cnt: bigint }[]>`
        SELECT date_trunc(${bucket}, "createdAt") as bucket, COUNT(*)::bigint as cnt
        FROM "User"
        WHERE "createdAt" >= ${range.start} AND "createdAt" < ${range.end}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;
      const series = rows.map((r) => ({
        bucket: r.bucket.toISOString().slice(0, 10),
        count: Number(r.cnt),
      }));
      return {
        content: [
          { type: "text", text: JSON.stringify({ granularity, series }, null, 2) },
        ],
      };
    },
  );

  server.registerTool(
    "users_lookup",
    {
      title: "Users lookup",
      description:
        "Look up a user by email, discordId, or subscriptionId. Email and discordId are masked unless reveal=true. Returns subscription state.",
      inputSchema: {
        by: z.enum(["email", "discordId", "subscriptionId"]),
        value: z.string().min(1),
        reveal: z.boolean().default(false),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ by, value, reveal }) => {
      const where =
        by === "email"
          ? { email: value }
          : by === "discordId"
            ? { discordId: value }
            : { subscriptionId: value };

      const u = await prisma.user.findFirst({ where });
      if (!u) {
        return { content: [{ type: "text", text: JSON.stringify({ found: false }) }] };
      }
      const out = {
        found: true,
        id: u.id,
        email: reveal ? u.email : maskEmail(u.email),
        name: u.name,
        discordId: reveal ? u.discordId : maskDiscordId(u.discordId),
        discordUsername: u.discordUsername,
        tier: u.tier,
        subscriptionStatus: u.subscriptionStatus,
        subscriptionId: u.subscriptionId,
        paymentProvider: u.paymentProvider,
        roleGranted: u.roleGranted,
        discordTrialExpiry: u.discordTrialExpiry,
        createdAt: u.createdAt,
      };
      return { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] };
    },
  );
}
