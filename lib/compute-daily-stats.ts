import {
  getFirstOpenCount,
  type AppName,
  type DownloadsByPlatform,
} from "@/lib/firebase-ga4";
import type { DiscordEmbed } from "@/lib/revenuecat-discord";

export async function computeDailyStats(): Promise<DiscordEmbed[][]> {
  const now = new Date();

  const apps: AppName[] = ["Glow", "Bible"];

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const messages: DiscordEmbed[][] = [];

  for (const app of apps) {
    let downloads: DownloadsByPlatform = { android: 0, ios: 0, total: 0 };
    try {
      downloads = await getFirstOpenCount(app, "yesterday", "today");
    } catch (err) {
      console.error(`GA4 query failed for ${app}:`, err);
    }

    messages.push([
      {
        title: `\u{1F4CA} [${app}] Daily Stats`,
        description: `**${dateStr}**`,
        color: 0x3498db,
        fields: [
          { name: "\u{1F4F1} iOS", value: `${downloads.ios}`, inline: true },
          { name: "\u{1F916} Android", value: `${downloads.android}`, inline: true },
          { name: "Total DL", value: `${downloads.total}`, inline: true },
        ],
        timestamp: now.toISOString(),
        footer: { text: "Tap & Swipe Daily Stats" },
      },
    ]);
  }

  return messages;
}
