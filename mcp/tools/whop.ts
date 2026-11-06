import { whopList, validWhopMemberships, resolveWhopAccountId, whopAmount, type CurrentWhopVariant } from "@/lib/whop-current";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchWhopMrr } from "@/lib/stats-helpers";

const ProductKey = z.enum(["community", "aso"]);

function whopKey(product: z.infer<typeof ProductKey>): string {
  const key = product === "community"
    ? process.env.WHOP_COMMUNITY_API_KEY
    : process.env.WHOP_ASO_API_KEY;
  if (!key) throw new Error(`Missing WHOP_${product.toUpperCase()}_API_KEY`);
  return key;
}

interface CachedPlans {
  fetchedAt: number;
  plans: PlanRecord[];
}

interface PlanRecord {
  id: string;
  name: string | null;
  renewalPrice: number;
  initialPrice: number;
  billingPeriodDays: number;
  monthlyEquivalent: number;
  currency: string | null;
  product: "community" | "aso";
}

const cache = new Map<string, CachedPlans>();
const TTL_MS = 60_000;

async function loadPlans(product: z.infer<typeof ProductKey>): Promise<PlanRecord[]> {
  const cached = cache.get(product);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.plans;
  }
  const apiKey = whopKey(product);
  const accountId = process.env[`WHOP_${product.toUpperCase()}_COMPANY_ID`] ?? await resolveWhopAccountId(apiKey);
  const plans: PlanRecord[] = [];
  for await (const plan of whopList<CurrentWhopVariant>(apiKey, "variants", { account_id: accountId })) {
    const renewal = whopAmount(plan.renewal_price);
    const period = plan.billing_period ?? 0;
    plans.push({
      id: plan.id,
      name: plan.title,
      renewalPrice: renewal,
      initialPrice: whopAmount(plan.initial_price),
      billingPeriodDays: period,
      monthlyEquivalent: plan.plan_type === "renewal" && period > 0 ? Math.round((renewal / period) * 30 * 100) / 100 : 0,
      currency: plan.currency,
      product,
    });
  }
  cache.set(product, { fetchedAt: Date.now(), plans });
  return plans;
}

async function countActiveMemberships(
  product: z.infer<typeof ProductKey>,
  planId?: string,
): Promise<{ total: number; byPlan: Record<string, number> }> {
  const apiKey = whopKey(product);
  const byPlan = new Map<string, number>();
  let total = 0;
  for await (const membership of validWhopMemberships(apiKey)) {
    if (planId && membership.plan_id !== planId) continue;
    total += 1;
    byPlan.set(membership.plan_id, (byPlan.get(membership.plan_id) ?? 0) + 1);
  }
  return { total, byPlan: Object.fromEntries(byPlan) };
}

export function registerWhopTools(server: McpServer) {
  server.registerTool(
    "whop_offers",
    {
      title: "Whop offers",
      description:
        "List active Whop plans (offers) for community or aso. Returns id, name, renewal_price, initial_price, billing_period_days, monthly_equivalent, currency. 60s in-memory cache.",
      inputSchema: { product: ProductKey },
      annotations: { readOnlyHint: true },
    },
    async ({ product }) => {
      const plans = await loadPlans(product);
      return {
        content: [{ type: "text", text: JSON.stringify({ plans }, null, 2) }],
      };
    },
  );

  server.registerTool(
    "whop_active_members",
    {
      title: "Whop active members",
      description:
        "Count of currently-valid memberships per Whop plan, optionally filtered to a specific planId.",
      inputSchema: {
        product: ProductKey,
        planId: z.string().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ product, planId }) => {
      const counts = await countActiveMemberships(product, planId);
      return { content: [{ type: "text", text: JSON.stringify(counts, null, 2) }] };
    },
  );

  server.registerTool(
    "whop_mrr",
    {
      title: "Whop MRR snapshot",
      description:
        "Estimated current MRR for a product, derived from active memberships and their plan billing periods. Wraps lib/stats-helpers fetchWhopMrr.",
      inputSchema: { product: ProductKey },
      annotations: { readOnlyHint: true },
    },
    async ({ product }) => {
      const apiKey = whopKey(product);
      const mrr = await fetchWhopMrr(apiKey);
      return {
        content: [
          { type: "text", text: JSON.stringify({ product, mrr }, null, 2) },
        ],
      };
    },
  );
}
