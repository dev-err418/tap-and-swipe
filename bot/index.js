import { Client, GatewayIntentBits, Events, Partials } from "discord.js";
import crypto from "node:crypto";

const {
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  APP_URL,
  DISCORD_BOT_SHARED_SECRET,
} = process.env;

for (const [name, value] of Object.entries({
  DISCORD_BOT_TOKEN,
  DISCORD_GUILD_ID,
  APP_URL,
  DISCORD_BOT_SHARED_SECRET,
})) {
  if (!value) {
    console.error(`[bot] missing required env var: ${name}`);
    process.exit(1);
  }
}

const ENDPOINT = `${APP_URL.replace(/\/$/, "")}/api/webhooks/discord/member-joined`;

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

client.once(Events.ClientReady, (c) => {
  console.log(`[bot] logged in as ${c.user.tag} — listening for joins on guild ${DISCORD_GUILD_ID}`);
});

client.on(Events.GuildMemberAdd, async (member) => {
  if (member.guild.id !== DISCORD_GUILD_ID) return;
  if (member.user.bot) return;

  const payload = JSON.stringify({
    discordId: member.id,
    username: member.user.username,
  });
  const signature = crypto
    .createHmac("sha256", DISCORD_BOT_SHARED_SECRET)
    .update(payload)
    .digest("hex");

  console.log(`[bot] guildMemberAdd discordId=${member.id} username=${member.user.username}`);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bot-Signature": `sha256=${signature}`,
      },
      body: payload,
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[bot] endpoint error status=${res.status} body=${text}`);
    } else {
      console.log(`[bot] endpoint ok status=${res.status} body=${text}`);
    }
  } catch (err) {
    console.error(`[bot] failed to call endpoint:`, err);
  }
});

client.on(Events.Error, (err) => {
  console.error(`[bot] client error:`, err);
});

process.on("SIGTERM", () => {
  console.log("[bot] SIGTERM received, shutting down");
  client.destroy().finally(() => process.exit(0));
});

client.login(DISCORD_BOT_TOKEN).catch((err) => {
  console.error("[bot] login failed:", err);
  process.exit(1);
});
