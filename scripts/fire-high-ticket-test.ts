/**
 * Fire a fake PLUNK_HIGH_TICKET_EVENT for arthur.spalanzani@utt.fr so the
 * Plunk drip workflow registers and can be wired up / tested in the dashboard.
 *
 * Usage:
 *   npx tsx scripts/fire-high-ticket-test.ts
 *   npx tsx scripts/fire-high-ticket-test.ts other@email.com
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

const TEST_EMAIL = process.argv[2] ?? "arthur.spalanzani@utt.fr";

const TEST_DATA: Record<string, string> = {
  firstName: "Arthur",
  country: "FR",
  budget: "$2,000 – $4,000",
  mrr: "<$1K",
  hasApp: "Yes, making revenue",
  challenge: "Test fire from scripts/fire-high-ticket-test.ts",
  ref: "manual-test",
  calBooked: "false",
};

async function main() {
  const plunkUrl = process.env.PLUNK_API_URL;
  const plunkSecretKey = process.env.PLUNK_API_KEY;
  const plunkPublicKey = process.env.PLUNK_PUBLIC_KEY;
  const plunkEvent = process.env.PLUNK_HIGH_TICKET_EVENT;

  const missing = [
    !plunkUrl && "PLUNK_API_URL",
    !plunkSecretKey && "PLUNK_API_KEY",
    !plunkPublicKey && "PLUNK_PUBLIC_KEY",
    !plunkEvent && "PLUNK_HIGH_TICKET_EVENT",
  ].filter(Boolean);
  if (missing.length > 0) {
    console.error(`Missing env: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log(`Firing event "${plunkEvent}" for ${TEST_EMAIL}`);
  console.log("Data:", TEST_DATA);

  const contactsRes = await fetch(`${plunkUrl}/contacts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${plunkSecretKey}`,
    },
    body: JSON.stringify({ email: TEST_EMAIL, data: TEST_DATA }),
  });
  if (!contactsRes.ok) {
    console.error("/contacts failed:", contactsRes.status, await contactsRes.text());
    process.exit(1);
  }
  console.log(`/contacts → ${contactsRes.status}`);

  const trackRes = await fetch(`${plunkUrl}/v1/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${plunkPublicKey}`,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      event: plunkEvent,
      data: TEST_DATA,
    }),
  });
  if (!trackRes.ok) {
    console.error("/v1/track failed:", trackRes.status, await trackRes.text());
    process.exit(1);
  }
  console.log(`/v1/track → ${trackRes.status}`);
  console.log("Done. Check Plunk → Contacts to confirm.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
