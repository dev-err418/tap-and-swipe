/**
 * One-shot: tear down the standalone "Join" product, then restructure the
 * existing community product (prod_vg0xgyVeKbBOm) so it carries two USD plans:
 * Starter $99/mo and Community $149/mo. Existing plans on that product are
 * hidden (not deleted) so prior subscribers stay valid.
 *
 * Usage:
 *   WHOP_API_KEY="$WHOP_COMMUNITY_API_KEY" npx tsx scripts/whop-restructure-community.ts            # dry run
 *   WHOP_API_KEY="$WHOP_COMMUNITY_API_KEY" npx tsx scripts/whop-restructure-community.ts --apply
 */

import "dotenv/config";
import { Whop } from "@whop/sdk";

const COMPANY_ID = "biz_MMXfuc0MqViuzQ";
const COMMUNITY_PRODUCT_ID = "prod_vg0xgyVeKbBOm";

const JOIN_PRODUCT_ID = "prod_dBblPMs3V7Lpm";
const JOIN_PLAN_IDS = ["plan_Y19pAMwo9Du5X", "plan_7C304LNdJFu1N"];

const NEW_STARTER_PRICE = 99;
const NEW_COMMUNITY_PRICE = 149;

async function main() {
  if (!process.env.WHOP_API_KEY) {
    console.error("WHOP_API_KEY not set");
    process.exit(1);
  }

  const whop = new Whop({
    apiKey: process.env.WHOP_API_KEY,
    webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET ?? ""),
  });

  const apply = process.argv.includes("--apply");

  // List existing plans on the community product
  const existing: Array<{ id: string; title: string | null; renewal_price: number | null; currency: string | null; visibility: string }> = [];
  for await (const plan of whop.plans.list({ company_id: COMPANY_ID, product_ids: [COMMUNITY_PRODUCT_ID] })) {
    existing.push({
      id: plan.id,
      title: plan.title,
      renewal_price: plan.renewal_price,
      currency: plan.currency,
      visibility: plan.visibility,
    });
  }

  console.log(`\nExisting plans on ${COMMUNITY_PRODUCT_ID}:`);
  for (const p of existing) {
    console.log(`  ${p.id}  ${p.renewal_price} ${p.currency}  visibility=${p.visibility}  ${p.title ?? "(no title)"}`);
  }

  const toHide = existing.filter((p) => p.visibility === "visible");

  console.log(`\nWill apply:`);
  console.log(`  1. Delete Join plans: ${JOIN_PLAN_IDS.join(", ")}`);
  console.log(`  2. Delete Join product: ${JOIN_PRODUCT_ID}`);
  console.log(`  3. Set visibility=hidden on ${toHide.length} currently-visible community plans (${toHide.map((p) => p.id).join(", ")})`);
  console.log(`  4. Create plan "Starter" — $${NEW_STARTER_PRICE}/mo on ${COMMUNITY_PRODUCT_ID}`);
  console.log(`  5. Create plan "Community" — $${NEW_COMMUNITY_PRICE}/mo on ${COMMUNITY_PRODUCT_ID}`);

  if (!apply) {
    console.log("\n(dry run; pass --apply to execute)");
    return;
  }

  // 1. Delete Join plans
  for (const planId of JOIN_PLAN_IDS) {
    await whop.plans.delete(planId);
    console.log(`🗑  deleted plan ${planId}`);
  }

  // 2. Delete Join product
  await whop.products.delete(JOIN_PRODUCT_ID);
  console.log(`🗑  deleted product ${JOIN_PRODUCT_ID}`);

  // 3. Hide currently-visible community plans (skip already hidden/archived)
  for (const p of toHide) {
    const updated = await whop.plans.update(p.id, { visibility: "hidden" });
    console.log(`👁  ${updated.id} → visibility=${updated.visibility}`);
  }

  // 4 + 5. Create the two new plans on the community product
  for (const [label, price] of [
    ["Starter", NEW_STARTER_PRICE],
    ["Community", NEW_COMMUNITY_PRICE],
  ] as const) {
    const created = await whop.plans.create({
      company_id: COMPANY_ID,
      product_id: COMMUNITY_PRODUCT_ID,
      billing_period: 30,
      currency: "usd",
      renewal_price: price,
      initial_price: 0,
      title: label,
      plan_type: "renewal",
      release_method: "buy_now",
      visibility: "visible",
      unlimited_stock: true,
    });
    console.log(`✅ created ${label}: ${created.id} — ${created.renewal_price} ${created.currency}/${created.billing_period}d  ${created.purchase_url}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
