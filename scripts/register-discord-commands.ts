import "dotenv/config";

const DISCORD_API = "https://discord.com/api/v10";
const APPLICATION_ID = process.env.DISCORD_CLIENT_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

const commands = [
  {
    name: "stats",
    type: 1,
    description:
      "Show daily stats report (downloads, trials, conversions, revenue)",
  },
];

async function main() {
  console.log("Registering global commands...");

  const res = await fetch(
    `${DISCORD_API}/applications/${APPLICATION_ID}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed: ${res.status} ${text}`);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`Registered ${data.length} command(s):`);
  for (const cmd of data) {
    console.log(`  /${cmd.name} (id: ${cmd.id})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
