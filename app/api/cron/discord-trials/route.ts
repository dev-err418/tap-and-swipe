import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { removeRole } from "@/lib/discord";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find users with expired Discord trials who are not active subscribers
    const expiredUsers = await prisma.user.findMany({
      where: {
        discordTrialExpiry: { lt: new Date() },
        NOT: { subscriptionStatus: "active" },
      },
      select: { discordId: true, id: true },
    });

    let revoked = 0;
    for (const user of expiredUsers) {
      if (!user.discordId) continue;
      await removeRole(user.discordId);
      await prisma.user.update({
        where: { id: user.id },
        data: { discordTrialExpiry: null },
      });
      revoked++;
    }

    console.log(`[discord-trials] Revoked ${revoked} expired trial(s)`);
    return NextResponse.json({ revoked });
  } catch (err) {
    console.error("[discord-trials] Error:", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
