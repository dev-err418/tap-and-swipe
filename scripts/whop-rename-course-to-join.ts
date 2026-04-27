/**
 * One-shot: rename the Course product to "Join" and set its route to "join".
 *
 * Usage:
 *   WHOP_API_KEY="$WHOP_COMMUNITY_API_KEY" npx tsx scripts/whop-rename-course-to-join.ts
 */

import "dotenv/config";
import { Whop } from "@whop/sdk";

const PRODUCT_ID = "prod_dBblPMs3V7Lpm";

async function main() {
  if (!process.env.WHOP_API_KEY) {
    console.error("WHOP_API_KEY not set");
    process.exit(1);
  }

  const whop = new Whop({
    apiKey: process.env.WHOP_API_KEY,
    webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET ?? ""),
  });

  const updated = await whop.products.update(PRODUCT_ID, {
    title: "Join",
  });

  console.log(`✅ Updated product ${updated.id}`);
  console.log(`   title: ${updated.title}`);
  console.log(`   route: ${updated.route}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
