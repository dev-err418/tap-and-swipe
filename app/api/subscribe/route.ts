import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const NEWSLETTER_WEBHOOK = process.env.SUBSCRIBE_DISCORD_WEBHOOK!;
const LISTMONK_TIMEOUT_MS = 10_000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function basicAuth(user: string, pass: string): string {
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
  try {
    const { email, website } = await req.json();

    // Honeypot: bots fill this hidden field, real users don't
    if (website) {
      return NextResponse.json({ ok: true });
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail.includes("@")) {
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

    const res = await fetchWithTimeout(
      `${listmonkUrl}/api/public/subscription`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          list_uuids: [listUuid],
        }),
      },
      LISTMONK_TIMEOUT_MS
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("Listmonk error:", res.status, body);
      return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
    }

    // Mirror to local DB so the drip cron can pick them up.
    // On re-subscribe of an existing row, only flip unsubscribed back to false;
    // never reset lastEmailIndex/subscribedAt or they'd get the drip again.
    await prisma.newsletterSubscriber.upsert({
      where: { email: normalizedEmail },
      create: { email: normalizedEmail, lastEmailIndex: 1, lastEmailAt: new Date() },
      update: { unsubscribed: false },
    });

    // Send welcome email via Listmonk transactional API
    if (listmonkUser && listmonkPass && welcomeTemplateId) {
      try {
        const welcomeRes = await fetchWithTimeout(
          `${listmonkUrl}/api/tx`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: basicAuth(listmonkUser, listmonkPass),
            },
            body: JSON.stringify({
              subscriber_email: normalizedEmail,
              template_id: Number(welcomeTemplateId),
              content_type: "html",
            }),
          },
          LISTMONK_TIMEOUT_MS
        );
        if (!welcomeRes.ok) {
          const body = await welcomeRes.text().catch(() => "");
          console.error("Welcome email error:", welcomeRes.status, body);
        }
      } catch (err) {
        console.error("Welcome email error:", err);
      }
    }

    // Discord notification (best-effort, don't block response)
    const h = await headers();
    const country = h.get("cf-ipcountry") || undefined;

    if (NEWSLETTER_WEBHOOK) {
      try {
        const discordRes = await fetchWithTimeout(
          NEWSLETTER_WEBHOOK,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              embeds: [
                {
                  title: "New newsletter subscriber",
                  color: 0xff9500,
                  fields: [
                    { name: "Email", value: normalizedEmail, inline: true },
                    { name: "Country", value: formatCountry(country), inline: true },
                  ],
                  timestamp: new Date().toISOString(),
                },
              ],
            }),
          },
          LISTMONK_TIMEOUT_MS
        );
        if (!discordRes.ok) {
          console.error("Newsletter Discord webhook error:", discordRes.status);
        }
      } catch (err) {
        console.error("Newsletter Discord webhook error:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Newsletter subscribe error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
