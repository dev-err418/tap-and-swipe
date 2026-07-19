import dotenv from "dotenv";
import { Whop } from "@whop/sdk";

dotenv.config({ path: ".env", quiet: true });
dotenv.config({ path: ".env.local", override: true, quiet: true });

const COMPANY_ID = process.env.WHOP_COMMUNITY_COMPANY_ID ?? "biz_MMXfuc0MqViuzQ";
const PRODUCT_IDS = new Set(
  (process.env.WHOP_COMMUNITY_PRODUCT_IDS ??
    "prod_vg0xgyVeKbBOm,prod_TxlfGvgqMHDYl,prod_YRIMjlpbs0Zan,prod_HVCcAphQRHzvI")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

async function main() {
  const apiKey = process.env.WHOP_COMMUNITY_API_KEY ?? process.env.WHOP_API_KEY;
  if (!apiKey) throw new Error("WHOP_COMMUNITY_API_KEY or WHOP_API_KEY is required");

  const [{ recordCommunityWhopPayment }, { prisma }] = await Promise.all([
    import("../lib/community-payment-analytics"),
    import("../lib/prisma"),
  ]);
  const whop = new Whop({ apiKey });
  let processed = 0;
  let initial = 0;
  let renewals = 0;
  let skipped = 0;

  try {
    for await (const payment of whop.payments.list({
      company_id: COMPANY_ID,
      first: 50,
    })) {
      const productId = stringId(payment.product);
      const amount = numberValue(payment.usd_total ?? payment.total);
      if (
        payment.status !== "paid" ||
        !productId ||
        !PRODUCT_IDS.has(productId) ||
        amount === null ||
        amount <= 0
      ) {
        skipped += 1;
        continue;
      }

      const membershipId = stringId(payment.membership);
      await recordCommunityWhopPayment({
        paymentId: payment.id,
        membershipId,
        amountUsd: amount,
        currency: payment.usd_total != null ? "usd" : payment.currency,
        billingReason: payment.billing_reason,
        occurredAt: payment.paid_at ? new Date(payment.paid_at) : new Date(payment.created_at),
      });
      processed += 1;
      if (payment.billing_reason === "subscription_cycle") renewals += 1;
      else initial += 1;
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log({ processed, initial, renewals, skipped });
}

function stringId(value: unknown): string | undefined {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" && id ? id : undefined;
  }
  return undefined;
}

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
