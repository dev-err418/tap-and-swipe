import { prisma } from "@/lib/prisma";
import type { CategorySlug } from "@/lib/roadmap";

export type UserTier = "standard" | "boilerplate" | "full";
export type CategoryAccess = "unlocked" | "locked" | "hidden";

export async function getUserTier(discordId: string): Promise<UserTier> {
  const row = await prisma.premiumUser.findUnique({
    where: { discordId },
  });
  if (!row) return "standard";
  return row.tier === "boilerplate" ? "boilerplate" : "full";
}

const ACCESS_MATRIX: Record<string, Record<UserTier, CategoryAccess>> = {
  scaling: { standard: "locked", boilerplate: "locked", full: "locked" },
};

export function getCategoryAccess(
  tier: UserTier,
  slug: CategorySlug | string
): CategoryAccess {
  const row = ACCESS_MATRIX[slug];
  if (!row) return "unlocked";
  return row[tier];
}
