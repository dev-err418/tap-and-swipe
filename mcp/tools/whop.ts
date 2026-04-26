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
  const plans: PlanRecord[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await fetch(
      `https://api.whop.com/api/v2/plans?per_page=50&page=${page}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!res.ok) throw new Error(`Whop plans API: ${res.status}`);
    const body = await res.json();
    const list = body.data ?? body;
    for (const p of Array.isArray(list) ? list : []) {
      const renewal = Number(p.renewal_price ?? 0);
      const initial = Number(p.initial_price ?? renewal);
      const period = Number(p.billing_period ?? 30);
      plans.push({
        id: p.id,
        name: p.name ?? p.internal_name ?? null,
        renewalPrice: renewal,
        initialPrice: initial,
        billingPeriodDays: period,
        monthlyEquivalent: period > 0 ? Math.round((renewal / period) * 30 * 100) / 100 : 0,
        currency: p.base_currency ?? null,
        product,
      });
    }
    const pagination = body.pagination;
    hasMore = pagination && pagination.current_page < pagination.total_page;
    page++;
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
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const res = await fetch(
      `https://api.whop.com/api/v2/memberships?valid=true&per_page=50&page=${page}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!res.ok) throw new Error(`Whop memberships API: ${res.status}`);
    const body = await res.json();
    const list = body.data ?? body;
    for (const m of Array.isArray(list) ? list : []) {
      if (planId && m.plan !== planId) continue;
      total += 1;
      byPlan.set(m.plan, (byPlan.get(m.plan) ?? 0) + 1);
    }
    const pagination = body.pagination;
    hasMore = pagination && pagination.current_page < pagination.total_page;
    page++;
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
