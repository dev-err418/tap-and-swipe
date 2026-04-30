import "dotenv/config";

type Tpl = { id: number; name: string; type: string; is_default: boolean; created_at: string };

async function main() {
  const url = process.env.LISTMONK_URL;
  const user = process.env.LISTMONK_API_USER;
  const pass = process.env.LISTMONK_API_PASSWORD;

  if (!url || !user || !pass) {
    console.error("Missing LISTMONK_URL / LISTMONK_API_USER / LISTMONK_API_PASSWORD in env.");
    process.exit(1);
  }

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  const res = await fetch(`${url}/api/templates`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    console.error(`Listmonk /api/templates returned ${res.status}`);
    console.error(await res.text());
    process.exit(1);
  }

  const json = (await res.json()) as { data: Tpl[] };

  console.log("\nID    TYPE          NAME");
  console.log("----  ------------  ----------------------------------------");
  for (const t of json.data) {
    console.log(
      `${String(t.id).padEnd(4)}  ${t.type.padEnd(12)}  ${t.name}${t.is_default ? "  (default)" : ""}`
    );
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
