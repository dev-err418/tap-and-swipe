interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export async function sendDiscordNotification(
  title: string,
  description: string | undefined,
  fields: EmbedField[],
  color: number = 0x57f287,
  webhookUrl?: string,
) {
  const url = webhookUrl || process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    console.error("DISCORD_WEBHOOK_URL not set, skipping notification");
    return;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title,
          description,
          color,
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Discord webhook failed (${res.status}): ${text}`);
  }
}

export async function sendFraudAlert(
  title: string,
  description: string,
  fields: EmbedField[]
) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) {
    console.error("DISCORD_WEBHOOK_URL not set, skipping fraud alert");
    return;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title,
          description,
          color: 0xff0000,
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Discord fraud alert webhook failed (${res.status}): ${text}`);
  }
}
