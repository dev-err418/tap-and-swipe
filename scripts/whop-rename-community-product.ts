/**
 * One-shot: rename the Community product on Whop.
 *
 * Usage:
 *   WHOP_API_KEY="$WHOP_COMMUNITY_API_KEY" npx tsx scripts/whop-rename-community-product.ts
 */

import "dotenv/config";
import { Whop } from "@whop/sdk";

const PRODUCT_ID = "prod_vg0xgyVeKbBOm";
const NEW_TITLE = "Community + Scale + ASO tool";

async function main() {
  if (!process.env.WHOP_API_KEY) {
    console.error("WHOP_API_KEY not set");
    process.exit(1);
  }

  const whop = new Whop({
    apiKey: process.env.WHOP_API_KEY,
    webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET ?? ""),
  });

  const before = await whop.products.retrieve(PRODUCT_ID);
  console.log(`Current title: ${before.title}`);

  const updated = await whop.products.update(PRODUCT_ID, {
    title: NEW_TITLE,
  });

  console.log(`✅ Updated product ${updated.id}`);
  console.log(`   title: ${updated.title}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
