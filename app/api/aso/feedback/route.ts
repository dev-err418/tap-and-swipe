import { NextResponse } from "next/server";
import { asoPool as pool } from "@/lib/aso-db";
import { getSession } from "@/lib/session";
import { stripe } from "@/lib/stripe";

async function isAdmin() {
  const session = await getSession();
  return session?.discordId === process.env.ADMIN_DISCORD_ID;
}

type FeedbackStatus = "Pro" | "Solo" | "Trialing" | "Expired";

// GET /api/aso/feedback — List all feedback with Stripe subscription status
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { rows } = await pool.query(
    `SELECT f.*, l.stripe_customer_id, l.plan, l.active
     FROM aso_feedback f
     LEFT JOIN aso_licenses l ON l.key = f.license_key
     ORDER BY f.created_at DESC`
  );

  // Batch-query Stripe for unique customer IDs
  const customerIds = [
    ...new Set(
      rows
        .filter((r: { stripe_customer_id?: string }) => r.stripe_customer_id)
        .map((r: { stripe_customer_id: string }) => r.stripe_customer_id)
    ),
  ] as string[];

  const statusMap = new Map<string, string>();
  await Promise.all(
    customerIds.map(async (customerId) => {
      try {
        const subs = await stripe.subscriptions.list({
          customer: customerId,
          limit: 1,
        });
        if (subs.data.length > 0) {
          statusMap.set(customerId, subs.data[0].status);
        }
      } catch {
        // Customer may have been deleted
      }
    })
  );

  const annotated = rows.map(
    (row: {
      stripe_customer_id?: string;
      plan?: string;
      active?: boolean;
    }) => {
      let status: FeedbackStatus = "Expired";
      const subStatus = row.stripe_customer_id
        ? statusMap.get(row.stripe_customer_id)
        : undefined;

      if (subStatus === "trialing") {
        status = "Trialing";
      } else if (subStatus === "active") {
        status = row.plan === "pro" ? "Pro" : "Solo";
      } else if (!subStatus && row.active) {
        // No Stripe sub found but license is active (e.g. manually granted)
        status = row.plan === "pro" ? "Pro" : "Solo";
      }

      return { ...row, status };
    }
  );

  return NextResponse.json(annotated);
}

// DELETE /api/aso/feedback — Remove a feedback entry
export async function DELETE(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await pool.query("DELETE FROM aso_feedback WHERE id = $1", [id]);

  return NextResponse.json({ deleted: id });
}
