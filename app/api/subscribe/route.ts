import { NextResponse } from "next/server";
import { headers } from "next/headers";

const NEWSLETTER_WEBHOOK = process.env.SUBSCRIBE_DISCORD_WEBHOOK!;
const PLUNK_TIMEOUT_MS = 10_000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

    const plunkUrl = process.env.PLUNK_API_URL;
    // /v1/track only accepts the public (pk_*) key, never the secret key.
    const plunkKey = process.env.PLUNK_PUBLIC_KEY;
    const plunkEvent = process.env.PLUNK_NEWSLETTER_EVENT ?? "newsletter_subscribed";

    if (!plunkUrl || !plunkKey) {
      console.error("Missing PLUNK_API_URL or PLUNK_PUBLIC_KEY env vars");
      return NextResponse.json({ error: "Newsletter not configured" }, { status: 500 });
    }

    const h = await headers();
    const country = h.get("cf-ipcountry") || undefined;

    // Plunk's /v1/track auto-creates the contact and fires the event, which
    // triggers the Workflow we configured (welcome → wait 2d → drip 2 → ...).
    // Re-subscribers are no-ops on contact creation but the event still fires
    // (Plunk dedupes drip workflows by contact + workflow).
    const res = await fetchWithTimeout(
      `${plunkUrl}/v1/track`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${plunkKey}`,
        },
        body: JSON.stringify({
          email: normalizedEmail,
          event: plunkEvent,
          subscribed: true,
          data: country ? { country } : undefined,
        }),
      },
      PLUNK_TIMEOUT_MS
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Plunk track error:", res.status, body);
      return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
    }

    // Discord notification (best-effort, don't block response)
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
          PLUNK_TIMEOUT_MS
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
