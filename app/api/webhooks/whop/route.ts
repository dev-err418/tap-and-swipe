import { NextRequest, NextResponse } from "next/server";
import Whop from "@whop/sdk";
import { prisma } from "@/lib/prisma";
import { addRole, removeRole } from "@/lib/discord";

const whopsdk = new Whop({
  apiKey: process.env.WHOP_API_KEY,
  webhookKey: btoa(process.env.WHOP_WEBHOOK_SECRET!),
});

function extractDiscord(data: Record<string, unknown>): {
  id: string;
  username: string;
} | null {
  const discord = data.discord;
  if (
    typeof discord === "object" &&
    discord !== null &&
    "id" in (discord as Record<string, unknown>)
  ) {
    const d = discord as Record<string, string>;
    return { id: String(d.id), username: d.username ?? String(d.id) };
  }
  if (typeof discord === "string" && discord.length > 0) {
    return { id: discord, username: discord };
  }
  return null;
}

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let webhookData;
  try {
    webhookData = whopsdk.webhooks.unwrap(bodyText, { headers });
  } catch (err) {
    console.error("[whop] Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // The discord field exists on the actual payload but isn't in the SDK types
    const data = webhookData.data as unknown as Record<string, unknown>;
    const discord = extractDiscord(data);

    switch (webhookData.type) {
      case "membership.activated": {
        if (!discord) {
          console.warn(
            `[whop] membership.activated — no Discord ID found, skipping. membership=${data.id}`
          );
          break;
        }

        const roleGranted = await addRole(discord.id);
        if (!roleGranted) {
          console.warn(
            `[whop] addRole returned false for ${discord.id} — user may not be in the guild`
          );
        }

        await prisma.user.upsert({
          where: { discordId: discord.id },
          update: {
            subscriptionStatus: "active",
            roleGranted,
          },
          create: {
            discordId: discord.id,
            discordUsername: discord.username,
            subscriptionStatus: "active",
            roleGranted,
          },
        });

        console.log(
          `[whop] membership.activated — discordId=${discord.id} roleGranted=${roleGranted}`
        );
        break;
      }

      case "membership.deactivated": {
        if (!discord) {
          console.warn(
            `[whop] membership.deactivated — no Discord ID found, skipping. membership=${data.id}`
          );
          break;
        }

        const user = await prisma.user.findUnique({
          where: { discordId: discord.id },
        });

        if (user) {
          await prisma.user.update({
            where: { discordId: discord.id },
            data: {
              subscriptionStatus: "canceled",
              roleGranted: false,
            },
          });
          await removeRole(discord.id);
          console.log(
            `[whop] membership.deactivated — discordId=${discord.id} role removed`
          );
        } else {
          console.warn(
            `[whop] membership.deactivated — user not found for discordId=${discord.id}`
          );
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[whop] Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
