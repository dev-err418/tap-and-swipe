const WEBHOOK_URL = process.env.REVENUECAT_DISCORD_WEBHOOK_URL!;

export interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
  footer?: { text: string };
  thumbnail?: { url: string };
}

export async function sendRevenueCatEmbed(
  embeds: DiscordEmbed[]
): Promise<string> {
  const res = await fetch(`${WEBHOOK_URL}?wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds }),
  });
  const data = await res.json();
  return data.id;
}

export async function editRevenueCatMessage(
  messageId: string,
  embeds: DiscordEmbed[]
): Promise<void> {
  await fetch(`${WEBHOOK_URL}/messages/${messageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds }),
  });
}
