// ── Shared helpers used by mobile/stats route and daily-stats cron ───

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// ── Whop MRR ────────────────────────────────────────────────────────────

export async function fetchWhopMrr(apiKey: string): Promise<number> {
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
      const renewalAmount = Number(
        plan.renewal_price ?? plan.initial_price ?? 0
      );
      const billingPeriod = Number(plan.billing_period ?? 30);
      const monthly =
        billingPeriod > 0 ? (renewalAmount / billingPeriod) * 30 : 0;
      planPrices.set(id, monthly);
    }

    const pagination = body.pagination;
    hasMorePlans =
      pagination && pagination.current_page < pagination.total_page;
    planPage++;
  }

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

export async function fetchSubscriberCount(): Promise<number> {
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
