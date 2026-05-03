/**
 * Check a Discord user's course-access state, then upsert them as active.
 *
 * Usage:
 *   npx tsx scripts/check-and-fix-access.ts <discordId>
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const discordId = process.argv[2];
  if (!discordId) {
    console.error("Usage: npx tsx scripts/check-and-fix-access.ts <discordId>");
    process.exit(1);
  }

  const before = await prisma.user.findUnique({
    where: { discordId },
    select: {
      id: true,
      email: true,
      discordId: true,
      discordUsername: true,
      subscriptionStatus: true,
      paymentProvider: true,
      tier: true,
      roleGranted: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log("Before:", before ?? "(no user record)");

  const user = await prisma.user.upsert({
    where: { discordId },
    update: { subscriptionStatus: "active" },
    create: { discordId, subscriptionStatus: "active" },
    select: {
      id: true,
      discordId: true,
      subscriptionStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log("After:", user);
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
