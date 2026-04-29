/**
 * Correct ASO license `plan` field to match what the customer is actually
 * paying for. Inference rules, applied to the customer's currently-active
 * (or trialing) Stripe sub:
 *
 *   - sub on a Community-bundle product (name starts with "Community") → pro
 *     (Community includes ASO Pro)
 *   - sub on an ASO product:
 *       monthly equivalent ≤ €14 → solo
 *       monthly equivalent  > €14 → pro
 *
 * Also flips active=false on any active=true license whose customer no longer
 * has a paying sub (defensive — shouldn't happen, but cheap to verify).
 *
 * Usage:
 *   ASO_DATABASE_URL=... npx tsx scripts/correct-aso-license-plans.ts [--apply]
 */

import "dotenv/config";
import Stripe from "stripe";
import { Pool } from "pg";

const APPLY = process.argv.includes("--apply");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const asoPool = new Pool({ connectionString: process.env.ASO_DATABASE_URL });

interface License {
  key: string;
  email: string;
  stripe_customer_id: string;
  plan: string;
  active: boolean;
}

const productNameCache = new Map<string, string>();

async function getProductName(productId: string): Promise<string> {
  if (productNameCache.has(productId)) return productNameCache.get(productId)!;
  try {
    const p = await stripe.products.retrieve(productId);
    productNameCache.set(productId, p.name);
    return p.name;
  } catch {
    productNameCache.set(productId, "");
    return "";
  }
}

function monthlyEquivalentEur(price: Stripe.Price): number {
  const amount = price.unit_amount ?? 0;
  const r = price.recurring;
  if (!r) return amount / 100;
  if (r.interval === "month") return (amount / 100) / r.interval_count;
  if (r.interval === "year") return (amount / 100) / (12 * r.interval_count);
  if (r.interval === "week") return (amount / 100) * 4.33 / r.interval_count;
  if (r.interval === "day") {
    // Whop uses interval=day with count=30 (monthly) or count=365 (yearly).
    return (amount / 100) * 30 / r.interval_count;
  }
  return amount / 100;
}

async function inferPlan(price: Stripe.Price): Promise<"solo" | "pro"> {
  const productId =
    typeof price.product === "string" ? price.product : price.product.id;
  const name = (await getProductName(productId)).toLowerCase();
  if (name.startsWith("community")) return "pro"; // bundle includes Pro

  // Whop split the migrated ASO product into multiple SKUs. The unsuffixed
  // "AppSprint ASO" carries the original Pro prices (€19/mo, €156/yr).
  // Suffixed variants like "AppSprint ASO - 3" / "- 6" / "- 7" are Solo SKUs.
  // Fall back to monthly-equivalent for anything else.
  if (name === "appsprint aso") return "pro";

  return monthlyEquivalentEur(price) <= 14 ? "solo" : "pro";
}

async function findPayingSub(customerId: string): Promise<Stripe.Subscription | null> {
  try {
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    return (
      list.data.find((s) => s.status === "active") ??
      list.data.find((s) => s.status === "trialing") ??
      null
    );
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

  const { rows } = await asoPool.query<License>(
    `SELECT key, email, stripe_customer_id, plan, active
       FROM aso_licenses
      WHERE active = true
        AND stripe_customer_id IS NOT NULL`
  );
  console.log(`Scanning ${rows.length} active stripe-keyed licenses...\n`);

  let corrected = 0;
  let okCount = 0;
  let toDeactivate = 0;

  for (const lic of rows) {
    const sub = await findPayingSub(lic.stripe_customer_id);
    if (!sub) {
      console.log(
        `DEACTIVATE  ${lic.email}  key=${lic.key}  cus=${lic.stripe_customer_id} — no active sub`
      );
      toDeactivate++;
      if (APPLY) {
        await asoPool.query(
          `UPDATE aso_licenses SET active = false WHERE key = $1`,
          [lic.key]
        );
      }
      continue;
    }

    const price = sub.items.data[0].price;
    const correctPlan = await inferPlan(price);

    if (correctPlan === lic.plan) {
      okCount++;
      continue;
    }

    const productId =
      typeof price.product === "string" ? price.product : price.product.id;
    const productName = await getProductName(productId);
    console.log(
      `FIX  ${lic.email}  key=${lic.key}  ${lic.plan} → ${correctPlan}  amount=${price.unit_amount} ${price.currency} ${price.recurring?.interval}/${price.recurring?.interval_count}  product="${productName}"`
    );
    corrected++;
    if (APPLY) {
      await asoPool.query(
        `UPDATE aso_licenses SET plan = $1 WHERE key = $2`,
        [correctPlan, lic.key]
      );
    }
  }

  console.log(
    `\nDone. ok=${okCount} corrected=${corrected} deactivated=${toDeactivate}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => asoPool.end());
