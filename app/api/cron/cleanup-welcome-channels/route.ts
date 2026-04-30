import { NextRequest, NextResponse } from "next/server";
import {
  listGuildChannels,
  deleteChannel,
  snowflakeCreatedAt,
} from "@/lib/discord";

const TTL_HOURS = 72;

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const welcomeCategoryId = process.env.DISCORD_WELCOME_CATEGORY_ID;
  if (!welcomeCategoryId) {
    return NextResponse.json(
      { error: "DISCORD_WELCOME_CATEGORY_ID not set" },
      { status: 500 }
    );
  }

  try {
    const channels = await listGuildChannels();
    const cutoff = Date.now() - TTL_HOURS * 60 * 60 * 1000;

    const stale = channels.filter(
      (c) =>
        c.type === 0 &&
        c.parent_id === welcomeCategoryId &&
        snowflakeCreatedAt(c.id).getTime() < cutoff
    );

    let deleted = 0;
    const errors: { id: string; name: string; error: string }[] = [];

    for (const channel of stale) {
      try {
        await deleteChannel(channel.id);
        deleted++;
        console.log(
          `[cleanup-welcome-channels] Deleted ${channel.name} (${channel.id})`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[cleanup-welcome-channels] Failed to delete ${channel.name}:`,
          message
        );
        errors.push({ id: channel.id, name: channel.name, error: message });
      }
    }

    return NextResponse.json({
      success: true,
      candidates: stale.length,
      deleted,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cleanup-welcome-channels] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
