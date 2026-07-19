import { prisma } from "@/lib/prisma";

export async function recordCommunityWhopPayment(input: {
  paymentId: string;
  membershipId?: string;
  visitorId?: string | null;
  amountUsd: number;
  currency?: string | null;
  billingReason?: string | null;
  occurredAt?: Date | null;
}) {
  if (!input.paymentId || !Number.isFinite(input.amountUsd) || input.amountUsd <= 0) {
    return false;
  }

  const occurredAt = input.occurredAt ?? new Date();
  const user = input.membershipId
    ? await prisma.user.findUnique({
        where: { whopMembershipId: input.membershipId },
        select: { visitorId: true },
      })
    : null;
  const visitorId =
    normalize(input.visitorId) ??
    normalize(user?.visitorId) ??
    (input.membershipId ? `whop:${input.membershipId}` : `whop-payment:${input.paymentId}`);
  const attribution = await prisma.pageEvent.findFirst({
    where: {
      product: "community",
      type: "page_view",
      visitorId,
      createdAt: { lte: occurredAt },
    },
    select: { country: true, referrer: true, ref: true },
    orderBy: { createdAt: "desc" },
  });
  const type = input.billingReason === "subscription_cycle" ? "renewal" : "paid";

  await prisma.pageEvent.upsert({
    where: {
      sessionId_type_product: {
        sessionId: input.paymentId,
        type,
        product: "community",
      },
    },
    create: {
      product: "community",
      type,
      visitorId,
      sessionId: input.paymentId,
      country: attribution?.country ?? null,
      referrer: attribution?.referrer ?? null,
      ref: attribution?.ref ?? null,
      revenue: Math.round(input.amountUsd * 100),
      currency: normalize(input.currency)?.toLowerCase() ?? "usd",
      createdAt: occurredAt,
    },
    update: {
      visitorId,
      country: attribution?.country ?? null,
      referrer: attribution?.referrer ?? null,
      ref: attribution?.ref ?? null,
      revenue: Math.round(input.amountUsd * 100),
      currency: normalize(input.currency)?.toLowerCase() ?? "usd",
      createdAt: occurredAt,
    },
  });

  return true;
}

function normalize(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
