import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getPostHogServer } from "@/lib/posthog";

const NEWSLETTER_WEBHOOK =
  "https://discord.com/api/webhooks/1493954020082192536/DyIegwcMj7JXvqnRrWXLM1m1jKGYgkGplb6-jYqUAwF8OLKbgM6mBzuB79FDf2yRA4Tv";

function formatCountry(countryCode?: string): string {
  if (!countryCode) return "\u{1F310} Unknown";
  const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  const fullName = regionNames.of(countryCode) || countryCode;
  const flag = countryCode
    .toUpperCase()
    .replace(/./g, (char: string) =>
      String.fromCodePoint(char.charCodeAt(0) + 127397)
    );
  return `${flag} ${fullName}`;
}

export async function POST(req: Request) {
  const { email, website } = await req.json();

  // Honeypot: bots fill this hidden field, real users don't
  if (website) {
    return NextResponse.json({ ok: true });
  }

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const listmonkUrl = process.env.LISTMONK_URL;
  const listUuid = process.env.LISTMONK_LIST_UUID;
  const listmonkUser = process.env.LISTMONK_API_USER;
  const listmonkPass = process.env.LISTMONK_API_PASSWORD;
  const welcomeTemplateId = process.env.LISTMONK_WELCOME_TEMPLATE_ID;

  if (!listmonkUrl || !listUuid) {
    console.error("Missing LISTMONK_URL or LISTMONK_LIST_UUID env vars");
    return NextResponse.json({ error: "Newsletter not configured" }, { status: 500 });
  }

  const res = await fetch(`${listmonkUrl}/api/public/subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      list_uuids: [listUuid],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Listmonk error:", res.status, body);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }

  // Send welcome email via Listmonk transactional API
  if (listmonkUser && listmonkPass && welcomeTemplateId) {
    fetch(`${listmonkUrl}/api/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${listmonkUser}:${listmonkPass}`)}`,
      },
      body: JSON.stringify({
        subscriber_email: email,
        template_id: Number(welcomeTemplateId),
        content_type: "html",
      }),
    }).catch((err) => console.error("Welcome email error:", err));
  }

  // PostHog + Discord notification (best-effort, don't block response)
  const h = await headers();
  const country = h.get("cf-ipcountry") || undefined;

  getPostHogServer().capture({
    distinctId: email,
    event: "newsletter_subscribe",
    properties: { country: country ?? null },
  });

  fetch(NEWSLETTER_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "New newsletter subscriber",
          color: 0xff9500,
          fields: [
            { name: "Email", value: email, inline: true },
            { name: "Country", value: formatCountry(country), inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  }).catch((err) => console.error("Newsletter Discord webhook error:", err));

  return NextResponse.json({ ok: true });
}
