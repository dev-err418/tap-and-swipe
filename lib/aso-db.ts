import { Pool } from "pg";
import crypto from "crypto";

export const asoPool = new Pool({
  connectionString: process.env.ASO_DATABASE_URL,
});

export type AsoPlan = "solo" | "pro";

/**
 * Generate a license key for a Stripe customer. Idempotent — returns existing key if one exists.
 * Format: ASO-XXXX-XXXX-XXXX-XXXX (uppercase hex)
 */
export async function generateAsoLicense(
  email: string,
  stripeCustomerId: string,
  plan: AsoPlan = "pro"
): Promise<{ key: string; isNew: boolean }> {
  // Idempotency: check for existing license
  const existing = await asoPool.query(
    "SELECT key FROM aso_licenses WHERE stripe_customer_id = $1 AND active = true LIMIT 1",
    [stripeCustomerId]
  );
  if (existing.rows.length > 0) {
    // Update plan in case it changed (e.g. upgrade)
    await asoPool.query(
      "UPDATE aso_licenses SET plan = $1 WHERE stripe_customer_id = $2 AND active = true",
      [plan, stripeCustomerId]
    );
    return { key: existing.rows[0].key, isNew: false };
  }

  // Check by email — catches duplicate checkouts with different Stripe customer IDs
  const existingByEmail = await asoPool.query(
    "SELECT key FROM aso_licenses WHERE email = $1 AND active = true LIMIT 1",
    [email]
  );
  if (existingByEmail.rows.length > 0) {
    return { key: existingByEmail.rows[0].key, isNew: false };
  }

  const segments = Array.from({ length: 4 }, () =>
    crypto.randomBytes(2).toString("hex").toUpperCase()
  );
  const key = `ASO-${segments.join("-")}`;

  await asoPool.query(
    "INSERT INTO aso_licenses (key, email, stripe_customer_id, plan) VALUES ($1, $2, $3, $4)",
    [key, email, stripeCustomerId, plan]
  );

  return { key, isNew: true };
}

export async function deactivateAsoLicenses(
  stripeCustomerId: string
): Promise<void> {
  await asoPool.query(
    "UPDATE aso_licenses SET active = false WHERE stripe_customer_id = $1 AND active = true",
    [stripeCustomerId]
  );
}

export async function reactivateAsoLicenses(
  stripeCustomerId: string
): Promise<void> {
  await asoPool.query(
    "UPDATE aso_licenses SET active = true WHERE stripe_customer_id = $1 AND active = false",
    [stripeCustomerId]
  );
}
