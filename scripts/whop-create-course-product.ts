/**
 * One-shot script: create a new Whop product (the Course) with two USD plans
 * ($99/mo Starter, $149/mo Pro). The product becomes a single Whop checkout
 * page exposing both pricing options.
 *
 * Usage:
 *   npx tsx scripts/whop-create-course-product.ts            # dry run
 *   npx tsx scripts/whop-create-course-product.ts --create   # actually create
 *
 * NOTE: WHOP_API_KEY in .env lacks plan:create. Run with
 *   WHOP_API_KEY="$WHOP_COMMUNITY_API_KEY" npx tsx scripts/whop-create-course-product.ts --create
 * (using the key from .env.local).
 */

import "dotenv/config";
import { Whop } from "@whop/sdk";

const COMPANY_ID = "biz_MMXfuc0MqViuzQ";

const PRODUCT_TITLE = "AppSprint Course";
const STARTER_PRICE = 99;
const PRO_PRICE = 149;

async function main() {
  if (!process.env.WHOP_API_KEY) {
    console.error("WHOP_API_KEY not set");
    process.exit(1);
  }

  const whop = new Whop({
    apiKey: process.env.WHOP_API_KEY,
    webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET ?? ""),
  });

  const create = process.argv.includes("--create");

  console.log(`\nWill create on company ${COMPANY_ID}:`);
  console.log(`  Product: "${PRODUCT_TITLE}"`);
  console.log(`  Plan 1: Starter — $${STARTER_PRICE}/mo (30d)`);
  console.log(`  Plan 2: Pro — $${PRO_PRICE}/mo (30d)`);

  if (!create) {
    console.log("\n(dry run; pass --create to create the product and plans)");
    return;
  }

  const product = await whop.products.create({
    company_id: COMPANY_ID,
    title: PRODUCT_TITLE,
    visibility: "visible",
  });

  console.log(`\n✅ Created product`);
  console.log(`   id: ${product.id}`);
  console.log(`   title: ${product.title}`);
  console.log(`   route: ${product.route}`);

  for (const [label, price] of [
    ["Starter", STARTER_PRICE],
    ["Pro", PRO_PRICE],
  ] as const) {
    const plan = await whop.plans.create({
      company_id: COMPANY_ID,
      product_id: product.id,
      billing_period: 30,
      currency: "usd",
      renewal_price: price,
      initial_price: 0,
      title: `${PRODUCT_TITLE} ${label}`,
      plan_type: "renewal",
      release_method: "buy_now",
      visibility: "visible",
      unlimited_stock: true,
    });

    console.log(`\n✅ Created plan ${label}`);
    console.log(`   id: ${plan.id}`);
    console.log(`   renewal_price: ${plan.renewal_price} ${plan.currency} / ${plan.billing_period}d`);
    console.log(`   purchase_url: ${plan.purchase_url}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
