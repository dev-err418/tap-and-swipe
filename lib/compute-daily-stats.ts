import { prisma } from "@/lib/prisma";
import { getFirstOpenCount, type AppName } from "@/lib/firebase-ga4";
import type { DiscordEmbed } from "@/lib/revenuecat-discord";

interface AppStats {
  downloads: number;
  trials: number;
  conversions: number;
  cancellations: number;
  renewals: number;
  revenue: number;
}

export async function computeDailyStats(): Promise<DiscordEmbed[]> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const apps: AppName[] = ["Glow", "Bible"];
  const results: Record<string, AppStats> = {};

  for (const app of apps) {
    const events = await prisma.revenueCatEvent.findMany({
      where: {
        appName: app,
        environment: "PRODUCTION",
        createdAt: { gte: yesterday },
      },
    });

    const trials = events.filter(
      (e) =>
        e.eventType === "TRIAL_STARTED" ||
        (e.eventType === "INITIAL_PURCHASE" && e.periodType === "TRIAL")
    ).length;

    const conversions = events.filter(
      (e) => e.eventType === "RENEWAL" && e.price > 0
    ).length;

    const cancellations = events.filter(
      (e) => e.eventType === "CANCELLATION"
    ).length;

    const renewals = events.filter(
      (e) => e.eventType === "RENEWAL"
    ).length;

    const revenue = events
      .filter((e) => e.price > 0)
      .reduce((sum, e) => sum + e.price, 0);

    let downloads = 0;
    try {
      downloads = await getFirstOpenCount(app, "yesterday", "today");
    } catch (err) {
      console.error(`GA4 query failed for ${app}:`, err);
    }

    results[app] = {
      downloads,
      trials,
      conversions,
      cancellations,
      renewals,
      revenue,
    };
  }

  const totalRevenue = Object.values(results).reduce(
    (s, r) => s + r.revenue,
    0
  );
  const totalDownloads = Object.values(results).reduce(
    (s, r) => s + r.downloads,
    0
  );
  const totalTrials = Object.values(results).reduce(
    (s, r) => s + r.trials,
    0
  );

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const embeds: DiscordEmbed[] = apps.map((app) => {
    const r = results[app];
    const dlToTrial =
      r.downloads > 0
        ? ((r.trials / r.downloads) * 100).toFixed(1) + "%"
        : "N/A";
    const trialToConv =
      r.trials > 0
        ? ((r.conversions / r.trials) * 100).toFixed(1) + "%"
        : "N/A";

    return {
      title: `\u{1F4CA} [${app}] Daily Stats`,
      description: `**${dateStr}**`,
      color: 0x3498db,
      fields: [
        { name: "Downloads", value: `${r.downloads}`, inline: true },
        { name: "Trials", value: `${r.trials}`, inline: true },
        { name: "Conversions", value: `${r.conversions}`, inline: true },
        { name: "Cancellations", value: `${r.cancellations}`, inline: true },
        { name: "Renewals", value: `${r.renewals}`, inline: true },
        { name: "Revenue", value: `$${r.revenue.toFixed(2)}`, inline: true },
        { name: "DL\u2192Trial", value: dlToTrial, inline: true },
        { name: "Trial\u2192Conv", value: trialToConv, inline: true },
      ],
      timestamp: now.toISOString(),
    };
  });

  embeds.push({
    title: `\u{1F4CA} [Total] Daily Stats`,
    color: 0x2ecc71,
    fields: [
      { name: "Revenue", value: `$${totalRevenue.toFixed(2)}`, inline: true },
      { name: "Downloads", value: `${totalDownloads}`, inline: true },
      { name: "Trials", value: `${totalTrials}`, inline: true },
    ],
    timestamp: now.toISOString(),
    footer: { text: "Tap & Swipe Daily Stats" },
  });

  return embeds;
}
