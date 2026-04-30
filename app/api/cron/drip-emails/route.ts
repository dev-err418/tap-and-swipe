import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const DRIP_STEPS = [
  { fromIndex: 1, toIndex: 2, dayOffset: 2, templateEnv: "LISTMONK_DRIP_DAY2_TEMPLATE_ID" },
  { fromIndex: 2, toIndex: 3, dayOffset: 4, templateEnv: "LISTMONK_DRIP_DAY4_TEMPLATE_ID" },
  { fromIndex: 3, toIndex: 4, dayOffset: 6, templateEnv: "LISTMONK_DRIP_DAY6_TEMPLATE_ID" },
] as const;

const PER_STEP_CAP = 200;
const LISTMONK_TIMEOUT_MS = 10_000;
const DRIP_LOCK_STALE_MINUTES = 30;

function listmonkAuthHeader() {
  const user = process.env.LISTMONK_API_USER;
  const pass = process.env.LISTMONK_API_PASSWORD;
  if (!user || !pass) return null;
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function syncUnsubscribesFromListmonk() {
  const { LISTMONK_URL, LISTMONK_LIST_UUID } = process.env;
  const auth = listmonkAuthHeader();
  if (!LISTMONK_URL || !LISTMONK_LIST_UUID || !auth) return 0;

  // Resolve list_id from the UUID we already have in env.
  const listsRes = await fetchWithTimeout(
    `${LISTMONK_URL}/api/lists`,
    { headers: { Authorization: auth } },
    LISTMONK_TIMEOUT_MS
  );
  if (!listsRes.ok) {
    console.error("[drip-emails] /api/lists failed", listsRes.status);
    return 0;
  }
  const listsJson = (await listsRes.json()) as {
    data?: { results?: { id: number; uuid: string }[] };
  };
  const list = (listsJson.data?.results ?? []).find((l) => l.uuid === LISTMONK_LIST_UUID);
  if (!list) return 0;

  // Page through unsubscribed subscribers for this list.
  const emails: string[] = [];
  for (let page = 1; ; page++) {
    const url = `${LISTMONK_URL}/api/subscribers?list_id=${list.id}&subscription_status=unsubscribed&page=${page}&per_page=200`;
    const res = await fetchWithTimeout(url, { headers: { Authorization: auth } }, LISTMONK_TIMEOUT_MS);
    if (!res.ok) {
      console.error("[drip-emails] /api/subscribers failed", res.status);
      break;
    }
    const json = (await res.json()) as { data?: { results?: { email: string }[] } };
    const batch = json.data?.results ?? [];
    if (batch.length === 0) break;
    for (const s of batch) emails.push(s.email);
    if (batch.length < 200) break;
  }

  if (emails.length === 0) return 0;
  const { count } = await prisma.newsletterSubscriber.updateMany({
    where: { email: { in: emails }, unsubscribed: false },
    data: { unsubscribed: true },
  });
  return count;
}

async function sendListmonkTx(email: string, templateId: string) {
  const { LISTMONK_URL } = process.env;
  const auth = listmonkAuthHeader();
  if (!LISTMONK_URL || !auth || !templateId) return false;
  const res = await fetchWithTimeout(
    `${LISTMONK_URL}/api/tx`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({
        subscriber_email: email,
        template_id: Number(templateId),
        content_type: "html",
      }),
    },
    LISTMONK_TIMEOUT_MS
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[drip-emails] /api/tx failed", res.status, body);
  }
  return res.ok;
}

async function claimDueSubscribers(step: (typeof DRIP_STEPS)[number], batchId: string, cutoff: Date) {
  const staleCutoff = new Date(Date.now() - DRIP_LOCK_STALE_MINUTES * 60 * 1000);
  return prisma.$queryRaw<{ id: string; email: string }[]>`
    WITH claimed AS (
      SELECT id
      FROM "NewsletterSubscriber"
      WHERE "unsubscribed" = false
        AND "lastEmailIndex" = ${step.fromIndex}
        AND "subscribedAt" <= ${cutoff}
        AND ("dripLockedAt" IS NULL OR "dripLockedAt" < ${staleCutoff})
      ORDER BY "subscribedAt" ASC, "id" ASC
      LIMIT ${PER_STEP_CAP}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "NewsletterSubscriber" ns
    SET "dripLockedAt" = ${new Date()},
        "dripLockedBy" = ${batchId}
    FROM claimed
    WHERE ns.id = claimed.id
    RETURNING ns.id, ns.email
  `;
}

async function clearLock(id: string, batchId: string) {
  await prisma.newsletterSubscriber.updateMany({
    where: { id, dripLockedBy: batchId },
    data: { dripLockedAt: null, dripLockedBy: null },
  });
}

async function advanceSubscriber(id: string, batchId: string, toIndex: number) {
  await prisma.newsletterSubscriber.updateMany({
    where: { id, dripLockedBy: batchId },
    data: {
      lastEmailIndex: toIndex,
      lastEmailAt: new Date(),
      dripLockedAt: null,
      dripLockedBy: null,
    },
  });
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const newlyUnsubscribed = await syncUnsubscribesFromListmonk();

    const now = Date.now();
    const sentByStep: Record<number, number> = {};

    for (const step of DRIP_STEPS) {
      const cutoff = new Date(now - step.dayOffset * 24 * 60 * 60 * 1000);
      const templateId = process.env[step.templateEnv];
      let sent = 0;
      if (!templateId) {
        sentByStep[step.toIndex] = 0;
        continue;
      }

      const batchId = randomUUID();
      const due = await claimDueSubscribers(step, batchId, cutoff);
      for (const sub of due) {
        const ok = await sendListmonkTx(sub.email, templateId);
        if (!ok) {
          await clearLock(sub.id, batchId);
          continue;
        }
        await advanceSubscriber(sub.id, batchId, step.toIndex);
        sent++;
      }
      sentByStep[step.toIndex] = sent;
    }

    console.log(`[drip-emails] sent`, sentByStep, `newlyUnsubscribed=${newlyUnsubscribed}`);
    return NextResponse.json({ sent: sentByStep, newlyUnsubscribed });
  } catch (err) {
    console.error("[drip-emails] Error:", err);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
