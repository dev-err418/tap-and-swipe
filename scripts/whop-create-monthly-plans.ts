/**
 * One-shot script: clone the existing quarterly Starter and Community plans
 * into new monthly plans (billing_period: 30 days).
 *
 * Usage:
 *   npx tsx scripts/whop-create-monthly-plans.ts            # dry run, prints existing plan details
 *   npx tsx scripts/whop-create-monthly-plans.ts --create   # creates the two new plans
 */

import "dotenv/config";
import { Whop } from "@whop/sdk";

const STARTER_QUARTERLY_ID = "plan_vHqdaNX5rCWER";
const COMMUNITY_QUARTERLY_ID = "plan_EmwyCxO8l96me";

const STARTER_MONTHLY_PRICE = 67;
const COMMUNITY_MONTHLY_PRICE = 127;

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

  const [starter, community] = await Promise.all([
    whop.plans.retrieve(STARTER_QUARTERLY_ID),
    whop.plans.retrieve(COMMUNITY_QUARTERLY_ID),
  ]);

  for (const [label, p] of [
    ["Starter quarterly", starter],
    ["Community quarterly", community],
  ] as const) {
    console.log(`\n── ${label} (${p.id}) ──`);
    console.log(`  title: ${p.title}`);
    console.log(`  company_id: ${p.company?.id}`);
    console.log(`  product_id: ${p.product?.id}`);
    console.log(`  billing_period: ${p.billing_period}`);
    console.log(`  currency: ${p.currency}`);
    console.log(`  initial_price: ${p.initial_price}`);
    console.log(`  renewal_price: ${p.renewal_price}`);
    console.log(`  trial_period_days: ${p.trial_period_days}`);
    console.log(`  release_method: ${p.release_method}`);
    console.log(`  plan_type: ${p.plan_type}`);
    console.log(`  visibility: ${p.visibility}`);
  }

  if (!create) {
    console.log("\n(dry run; pass --create to create the two monthly plans)");
    return;
  }

  // Community is already monthly (billing_period: 30, renewal_price: 127). Only Starter needs a new monthly plan.
  void COMMUNITY_MONTHLY_PRICE;
  void community;
  for (const [label, source, monthlyPrice] of [
    ["Starter Community (Monthly)", starter, STARTER_MONTHLY_PRICE],
  ] as const) {
    if (!source.company?.id || !source.product?.id) {
      throw new Error(`Source plan ${source.id} missing company/product id`);
    }

    const created = await whop.plans.create({
      company_id: source.company.id,
      product_id: source.product.id,
      billing_period: 30,
      currency: source.currency,
      renewal_price: monthlyPrice,
      initial_price: 0,
      title: label,
      plan_type: source.plan_type,
      release_method: source.release_method,
      visibility: source.visibility,
      trial_period_days: source.trial_period_days,
      unlimited_stock: true,
    });

    console.log(`\n✅ Created ${label}`);
    console.log(`   id: ${created.id}`);
    console.log(`   billing_period: ${created.billing_period}`);
    console.log(`   renewal_price: ${created.renewal_price} ${created.currency}`);
    console.log(`   purchase_url: ${created.purchase_url}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
