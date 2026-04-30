// One-shot migration: pull confirmed subscribers from Listmonk and create
// them as subscribed contacts in Plunk. Skips already-unsubscribed users.
// Does NOT fire the workflow trigger event — these subscribers are past Day 0
// of the drip, we don't want to start them over.
//
// Run with:
//   DRY_RUN=true  npx tsx scripts/migrate-listmonk-to-plunk.ts   # log only
//   DRY_RUN=false npx tsx scripts/migrate-listmonk-to-plunk.ts   # actually write to Plunk
//
// Required env (loaded from .env.local via dotenv):
//   LISTMONK_URL, LISTMONK_LIST_UUID, LISTMONK_API_USER, LISTMONK_API_PASSWORD
//   PLUNK_API_URL  (e.g. https://plunk-api.tap-and-swipe.com)
//   PLUNK_API_KEY  (sk_... from Plunk dashboard)
import "dotenv/config";

type ListmonkSubscriber = {
  id: number;
  email: string;
  name: string | null;
  status: string; // "enabled" | "disabled" | "blocklisted"
  attribs: Record<string, unknown>;
  lists: { id: number; uuid: string; subscription_status: string }[];
};

const DRY_RUN = (process.env.DRY_RUN ?? "true").toLowerCase() !== "false";

async function main() {
  const {
    LISTMONK_URL,
    LISTMONK_LIST_UUID,
    LISTMONK_API_USER,
    LISTMONK_API_PASSWORD,
    PLUNK_API_URL,
    PLUNK_API_KEY,
  } = process.env;

  if (
    !LISTMONK_URL ||
    !LISTMONK_LIST_UUID ||
    !LISTMONK_API_USER ||
    !LISTMONK_API_PASSWORD
  ) {
    console.error("Missing LISTMONK_* env vars in .env.local");
    process.exit(1);
  }
  if (!PLUNK_API_URL || !PLUNK_API_KEY) {
    console.error("Missing PLUNK_API_URL or PLUNK_API_KEY env vars");
    process.exit(1);
  }

  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE (writes to Plunk)"}`);

  const listmonkAuth = `Basic ${Buffer.from(`${LISTMONK_API_USER}:${LISTMONK_API_PASSWORD}`).toString("base64")}`;

  // Resolve numeric list_id from the UUID we already have.
  const listsRes = await fetch(`${LISTMONK_URL}/api/lists`, {
    headers: { Authorization: listmonkAuth },
  });
  if (!listsRes.ok) {
    console.error(`Listmonk /api/lists failed: ${listsRes.status} ${await listsRes.text()}`);
    process.exit(1);
  }
  const listsJson = (await listsRes.json()) as {
    data?: { results?: { id: number; uuid: string }[] };
  };
  const list = (listsJson.data?.results ?? []).find((l) => l.uuid === LISTMONK_LIST_UUID);
  if (!list) {
    console.error(`List with UUID ${LISTMONK_LIST_UUID} not found in Listmonk`);
    process.exit(1);
  }
  console.log(`Resolved list_id=${list.id} for UUID=${LISTMONK_LIST_UUID}`);

  // Page through ALL subscribers on the list (we filter unsubscribed ourselves).
  // Listmonk's `subscription_status=confirmed` only matches double-opt-in lists;
  // single-opt-in lists keep subscribers as `unconfirmed`. Both are valid.
  const subscribers: ListmonkSubscriber[] = [];
  for (let page = 1; ; page++) {
    const url = `${LISTMONK_URL}/api/subscribers?list_id=${list.id}&page=${page}&per_page=200`;
    const res = await fetch(url, { headers: { Authorization: listmonkAuth } });
    if (!res.ok) {
      console.error(`Listmonk /api/subscribers page ${page} failed: ${res.status}`);
      break;
    }
    const json = (await res.json()) as { data?: { results?: ListmonkSubscriber[] } };
    const batch = json.data?.results ?? [];
    if (batch.length === 0) break;
    subscribers.push(...batch);
    if (batch.length < 200) break;
  }

  // Keep only globally enabled and not list-level unsubscribed.
  const eligible = subscribers.filter((s) => {
    if (s.status !== "enabled") return false;
    const listEntry = s.lists?.find((l) => l.id === list.id);
    return listEntry?.subscription_status !== "unsubscribed";
  });
  console.log(
    `Listmonk: pulled ${subscribers.length} subscribers, ${eligible.length} eligible for migration`
  );

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const sub of eligible) {
    const payload = {
      email: sub.email.toLowerCase().trim(),
      subscribed: true,
      data: {
        ...(sub.name ? { name: sub.name } : {}),
        migrated_from_listmonk: true,
        listmonk_id: sub.id,
      },
    };

    if (DRY_RUN) {
      console.log(`[dry-run] would create: ${payload.email}`);
      continue;
    }

    try {
      const res = await fetch(`${PLUNK_API_URL}/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PLUNK_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 409 || res.status === 422) {
        // Already exists — Plunk returns 409 or 422 depending on version. Skip.
        skipped++;
        continue;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`Failed for ${payload.email}: ${res.status} ${body}`);
        failed++;
        continue;
      }
      created++;
      // Polite delay to avoid hammering the API on a fresh deploy.
      await new Promise((r) => setTimeout(r, 50));
    } catch (err) {
      console.error(`Error creating ${payload.email}:`, err);
      failed++;
    }
  }

  console.log("");
  console.log(`Done. created=${created} skipped=${skipped} failed=${failed}`);
  if (DRY_RUN) {
    console.log("Re-run with DRY_RUN=false to actually write to Plunk.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
