import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import {
  verifyKey,
  InteractionType,
  InteractionResponseType,
} from "discord-interactions";
import { computeDailyStats } from "@/lib/compute-daily-stats";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");

  if (!signature || !timestamp) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const isValid = await verifyKey(
    body,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY!
  );

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const interaction = JSON.parse(body);

  if (interaction.type === InteractionType.PING) {
    return NextResponse.json({ type: InteractionResponseType.PONG });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    if (interaction.data.name === "stats") {
      after(async () => {
        const messages = await computeDailyStats();
        const applicationId = process.env.DISCORD_CLIENT_ID!;
        const webhookUrl = `https://discord.com/api/v10/webhooks/${applicationId}/${interaction.token}`;

        // Edit the deferred response with the first app
        await fetch(`${webhookUrl}/messages/@original`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: messages[0] }),
        });

        // Send follow-up messages for remaining apps
        for (let i = 1; i < messages.length; i++) {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: messages[i] }),
          });
        }
      });

      return NextResponse.json({
        type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
      });
    }
  }

  return NextResponse.json({ error: "Unknown interaction" }, { status: 400 });
}
