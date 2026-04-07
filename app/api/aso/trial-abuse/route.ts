import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getSession } from "@/lib/session";
import { stripe } from "@/lib/stripe";

const pool = new Pool({
  connectionString: process.env.ASO_DATABASE_URL,
});

async function cancelStripeSubscription(key: string) {
  try {
    const { rows } = await pool.query(
      "SELECT stripe_customer_id FROM aso_licenses WHERE key = $1",
      [key]
    );
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) return;
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 });
    for (const sub of subs.data) {
      await stripe.subscriptions.cancel(sub.id);
    }
  } catch (e) {
    console.error(`[TrialAbuse] Failed to cancel Stripe subscription for ${key}:`, e);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (session?.discordId !== process.env.ADMIN_DISCORD_ID) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { key, action } = await req.json();
  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "missing_key" }, { status: 400 });
  }

  if (action === "clear") {
    const { rowCount } = await pool.query(
      "UPDATE aso_licenses SET status = 'active', active = true, warned_at = NULL, appeal_token = NULL WHERE key = $1",
      [key]
    );
    return NextResponse.json({ cleared: (rowCount ?? 0) > 0 });
  }

  if (action === "revoke") {
    const { rowCount } = await pool.query(
      "UPDATE aso_licenses SET status = 'revoked', active = false WHERE key = $1",
      [key]
    );
    if ((rowCount ?? 0) > 0) await cancelStripeSubscription(key);
    return NextResponse.json({ revoked: (rowCount ?? 0) > 0 });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
