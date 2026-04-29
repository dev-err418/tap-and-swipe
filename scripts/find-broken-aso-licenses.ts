/**
 * Find every ASO license that is currently inactive but whose owner is
 * actually still paying (active or trialing Stripe sub on the same customer).
 *
 * Usage:
 *   ASO_DATABASE_URL=... npx tsx scripts/find-broken-aso-licenses.ts [--apply]
 *
 * Without --apply this is a dry run.
 */

import "dotenv/config";
import Stripe from "stripe";
import { Pool } from "pg";

const APPLY = process.argv.includes("--apply");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const asoPool = new Pool({ connectionString: process.env.ASO_DATABASE_URL });

interface BrokenLicense {
  key: string;
  email: string;
  stripe_customer_id: string;
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

  const { rows } = await asoPool.query<BrokenLicense>(
    `SELECT key, email, stripe_customer_id
       FROM aso_licenses
      WHERE active = false
        AND status != 'revoked'
        AND stripe_customer_id IS NOT NULL`
  );

  console.log(`Scanning ${rows.length} inactive stripe-keyed licenses...\n`);

  const stillPaying: BrokenLicense[] = [];

  for (const lic of rows) {
    let subs: Stripe.Subscription[] = [];
    try {
      const list = await stripe.subscriptions.list({
        customer: lic.stripe_customer_id,
        status: "all",
        limit: 10,
      });
      subs = list.data;
    } catch {
      continue;
    }
    const paying = subs.find(
      (s) => s.status === "active" || s.status === "trialing"
    );
    if (paying) {
      console.log(
        `BROKEN  ${lic.email}  key=${lic.key}  cus=${lic.stripe_customer_id}  paying-sub=${paying.id} (${paying.status})`
      );
      stillPaying.push(lic);
    }
  }

  console.log(`\nFound ${stillPaying.length} licenses to reactivate.`);

  if (!APPLY || stillPaying.length === 0) return;

  for (const lic of stillPaying) {
    await asoPool.query(
      `UPDATE aso_licenses SET active = true WHERE key = $1`,
      [lic.key]
    );
    console.log(`  reactivated ${lic.key} (${lic.email})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => asoPool.end());
