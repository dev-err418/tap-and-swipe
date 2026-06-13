/**
 * Create and send the first Tap & Swipe Plunk newsletter campaign.
 *
 * Usage:
 *   npx tsx scripts/plunk-newsletter-campaign.ts preview
 *   npx tsx scripts/plunk-newsletter-campaign.ts test [email]
 *   npx tsx scripts/plunk-newsletter-campaign.ts test-existing <campaign-id> [email]
 *   npx tsx scripts/plunk-newsletter-campaign.ts update <campaign-id>
 *   npx tsx scripts/plunk-newsletter-campaign.ts create-draft
 *   npx tsx scripts/plunk-newsletter-campaign.ts send <campaign-id> --confirm-send-all
 *   npx tsx scripts/plunk-newsletter-campaign.ts schedule <campaign-id> <ISO datetime> --confirm-send-all
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

type Contact = {
  id: string;
  email: string;
  subscribed: boolean;
  data?: Record<string, unknown>;
};

type ContactListResponse =
  | Contact[]
  | {
      contacts?: Contact[];
      data?: Contact[];
      cursor?: string | null;
      nextCursor?: string | null;
      next?: string | null;
      hasMore?: boolean;
      total?: number;
    };

const PLUNK_API_URL = process.env.PLUNK_API_URL;
const PLUNK_API_KEY = process.env.PLUNK_API_KEY;
const DEFAULT_TEST_EMAIL = process.env.PLUNK_TEST_EMAIL ?? "arthur@tap-and-swipe.com";
const FROM_EMAIL = process.env.PLUNK_NEWSLETTER_FROM ?? "arthur@tap-and-swipe.com";
const FROM_NAME = process.env.PLUNK_NEWSLETTER_FROM_NAME ?? "Arthur from Tap & Swipe";
const REPLY_TO = process.env.PLUNK_NEWSLETTER_REPLY_TO ?? FROM_EMAIL;

const CAMPAIGN = {
  name: "Newsletter 002 - Bryl Lim / Tarsi",
  description: "Second Tap & Swipe newsletter: Bryl Lim's Tarsi case study and YouTube episode.",
  subject: "He built a paid app in a weekend. It made $20K in month one.",
  htmlPath: resolve("plunk-campaigns/2026-05-25-bryl-tarsi.html"),
};

const command = process.argv[2] ?? "preview";

function campaignPayload(body: string) {
  return {
    name: CAMPAIGN.name,
    description: CAMPAIGN.description,
    subject: CAMPAIGN.subject,
    body,
    from: FROM_EMAIL,
    fromName: FROM_NAME,
    replyTo: REPLY_TO,
    type: "HEADLESS",
    audienceType: "FILTERED",
    audienceCondition: {
      logic: "AND",
      groups: [
        {
          filters: [
            {
              field: "data.onboarded",
              operator: "equals",
              value: "true",
            },
          ],
        },
      ],
    },
  };
}

function assertEnv() {
  const missing = [
    !PLUNK_API_URL && "PLUNK_API_URL",
    !PLUNK_API_KEY && "PLUNK_API_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }
}

function assertBulkSendConfirmed() {
  if (!process.argv.includes("--confirm-send-all")) {
    throw new Error("Refusing bulk send without --confirm-send-all.");
  }
}

function normalizeScheduledFor(input: string | undefined): string {
  if (!input) {
    throw new Error("Missing scheduled time. Use an ISO datetime, e.g. 2026-05-15T16:00:00+02:00.");
  }

  const normalized = input.includes(" ") && !input.includes("T") ? input.replace(" ", "T") : input;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid scheduled time: ${input}`);
  }

  if (date.getTime() <= Date.now()) {
    throw new Error(`Scheduled time must be in the future: ${input}`);
  }

  return date.toISOString();
}

async function plunk<T>(path: string, init: RequestInit = {}): Promise<T> {
  assertEnv();

  const res = await fetch(`${PLUNK_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PLUNK_API_KEY}`,
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Plunk ${path} failed: ${res.status} ${body}`);
  }

  return (await res.json().catch(() => ({}))) as T;
}

function isOnboarded(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;

  return data.onboarded === true || data.onboarded === "true";
}

async function getContacts(): Promise<Contact[]> {
  const contacts: Contact[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 1000; page++) {
    const qs = new URLSearchParams({ limit: "100" });
    if (cursor) qs.set("cursor", cursor);

    const json = await plunk<ContactListResponse>(`/contacts?${qs.toString()}`, {
      method: "GET",
    });

    const batch = Array.isArray(json) ? json : json.contacts ?? json.data ?? [];
    contacts.push(...batch);

    if (Array.isArray(json)) break;

    cursor = json.cursor ?? json.nextCursor ?? json.next ?? undefined;
    if (!cursor && !json.hasMore) break;
  }

  return contacts;
}

async function getOnboardedRecipients(): Promise<Contact[]> {
  const contacts = await getContacts();
  return contacts.filter((contact) => contact.subscribed && isOnboarded(contact.data));
}

async function createCampaign(recipients: string[]) {
  void recipients;
  const body = await readFile(CAMPAIGN.htmlPath, "utf8");

  return plunk<{
    success: boolean;
    data: {
      id: string;
      name: string;
      subject: string;
      status: string;
      totalRecipients: number;
      createdAt: string;
    };
  }>("/campaigns", {
    method: "POST",
    body: JSON.stringify(campaignPayload(body)),
  });
}

async function updateCampaign(id: string) {
  const body = await readFile(CAMPAIGN.htmlPath, "utf8");

  return plunk<{
    success: boolean;
    data: {
      id: string;
      name: string;
      subject: string;
      status: string;
      totalRecipients: number;
      updatedAt: string;
    };
  }>(`/campaigns/${id}`, {
    method: "PUT",
    body: JSON.stringify(campaignPayload(body)),
  });
}

async function sendTest(id: string, email: string) {
  return plunk<{ success: boolean; message: string }>(`/campaigns/${id}/test`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

async function sendCampaign(id: string, scheduledFor?: string) {
  return plunk<{ success: boolean; message: string; data?: { id: string; status: string } }>(`/campaigns/${id}/send`, {
    method: "POST",
    body: JSON.stringify(scheduledFor ? { scheduledFor } : {}),
  });
}

async function preview() {
  const contacts = await getContacts();
  const onboarded = contacts.filter((contact) => isOnboarded(contact.data));
  const recipients = contacts.filter((contact) => contact.subscribed && isOnboarded(contact.data));

  console.log(`Subject: ${CAMPAIGN.subject}`);
  console.log(`HTML: ${CAMPAIGN.htmlPath}`);
  console.log(`Contacts total: ${contacts.length}`);
  console.log(`Onboarded true: ${onboarded.length}`);
  console.log(`Subscribed + onboarded true recipients: ${recipients.length}`);
}

async function test(email = DEFAULT_TEST_EMAIL) {
  const campaign = await createCampaign([]);
  console.log(`Created draft campaign: ${campaign.data.id}`);
  console.log(`Draft recipients: ${campaign.data.totalRecipients}`);
  const result = await sendTest(campaign.data.id, email);
  console.log("Test send queued:", result);
  console.log(`Recipient: ${email}`);
  console.log("Send this draft to all onboarded recipients with:");
  console.log(`  npx tsx scripts/plunk-newsletter-campaign.ts send ${campaign.data.id} --confirm-send-all`);
}

async function testExisting(id: string | undefined, email = DEFAULT_TEST_EMAIL) {
  if (!id) {
    throw new Error("Missing campaign id.");
  }

  const result = await sendTest(id, email);
  console.log("Test send queued:", result);
  console.log(`Recipient: ${email}`);
  console.log("Send this draft to all onboarded recipients with:");
  console.log(`  npx tsx scripts/plunk-newsletter-campaign.ts send ${id} --confirm-send-all`);
}

async function updateExisting(id: string | undefined) {
  if (!id) {
    throw new Error("Missing campaign id.");
  }

  const campaign = await updateCampaign(id);
  console.log(`Updated campaign: ${campaign.data.id}`);
  console.log(`Status: ${campaign.data.status}`);
  console.log(`Recipients: ${campaign.data.totalRecipients}`);
}

async function createDraft() {
  const recipients = await getOnboardedRecipients();

  if (recipients.length === 0) {
    throw new Error("No subscribed + onboarded recipients found.");
  }

  const campaign = await createCampaign(recipients.map((contact) => contact.id));
  console.log(`Created production draft: ${campaign.data.id}`);
  console.log(`Recipients: ${recipients.length}`);
  console.log("Send with:");
  console.log(`  npx tsx scripts/plunk-newsletter-campaign.ts send ${campaign.data.id} --confirm-send-all`);
}

async function sendProduction(id: string | undefined) {
  if (!id) {
    throw new Error("Missing campaign id.");
  }

  assertBulkSendConfirmed();

  const result = await sendCampaign(id);
  console.log("Production send queued:", result);
}

async function scheduleProduction(id: string | undefined, scheduledForInput: string | undefined) {
  if (!id) {
    throw new Error("Missing campaign id.");
  }

  assertBulkSendConfirmed();

  const scheduledFor = normalizeScheduledFor(scheduledForInput);
  const result = await sendCampaign(id, scheduledFor);
  console.log("Production send scheduled:", result);
  console.log(`Scheduled for: ${scheduledFor}`);
}

async function main() {
  switch (command) {
    case "preview":
      await preview();
      break;
    case "test":
      await test(process.argv[3]);
      break;
    case "test-existing":
      await testExisting(process.argv[3], process.argv[4]);
      break;
    case "update":
      await updateExisting(process.argv[3]);
      break;
    case "create-draft":
      await createDraft();
      break;
    case "send":
      await sendProduction(process.argv[3]);
      break;
    case "schedule":
      await scheduleProduction(process.argv[3], process.argv[4]);
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
