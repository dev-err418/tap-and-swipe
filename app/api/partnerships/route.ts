import { NextResponse } from "next/server";

const PARTNERSHIPS_WEBHOOK = process.env.PARTNERSHIPS_DISCORD_WEBHOOK!;

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY!;

const VALID_INTEGRATIONS = ["website", "newsletter", "youtube"] as const;
type Integration = (typeof VALID_INTEGRATIONS)[number];

async function verifyTurnstile(token: string): Promise<boolean> {
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token,
      }),
    }
  );
  const data = await res.json();
  return data.success === true;
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    firstName,
    lastName,
    email,
    companyName,
    companyWebsite,
    message,
    integrations,
    name,
  } = body;
  const cfToken = body["cf-turnstile-response"];

  // Honeypot: bots fill the hidden "name" field, real users don't
  if (name) {
    return NextResponse.json({ ok: true });
  }

  // Cloudflare Turnstile verification
  if (!cfToken || typeof cfToken !== "string" || !(await verifyTurnstile(cfToken))) {
    return NextResponse.json({ ok: true }); // silent reject
  }

  if (
    !firstName || typeof firstName !== "string" ||
    !lastName || typeof lastName !== "string" ||
    !email || typeof email !== "string" ||
    !companyName || typeof companyName !== "string" ||
    !companyWebsite || typeof companyWebsite !== "string" ||
    !message || typeof message !== "string" ||
    !Array.isArray(integrations)
  ) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  const cleanedIntegrations = integrations.filter(
    (v): v is Integration =>
      typeof v === "string" && (VALID_INTEGRATIONS as readonly string[]).includes(v)
  );

  if (cleanedIntegrations.length === 0) {
    return NextResponse.json(
      { error: "Select at least one integration type" },
      { status: 400 }
    );
  }

  // Reject if message is too short to be meaningful
  if (message.trim().length < 10) {
    return NextResponse.json({ ok: true }); // silent reject
  }

  // Basic email sanity check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ ok: true }); // silent reject
  }

  try {
    await fetch(PARTNERSHIPS_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "New Partnership submission",
            color: 0x2563eb,
            fields: [
              { name: "Name", value: `${firstName} ${lastName}`.trim(), inline: true },
              { name: "Email", value: email, inline: true },
              { name: "Company", value: companyName, inline: true },
              { name: "Website", value: companyWebsite, inline: true },
              { name: "Integrations", value: cleanedIntegrations.join(", "), inline: true },
              { name: "Message", value: message },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (err) {
    console.error("Partnerships Discord webhook error:", err);
    return NextResponse.json(
      { error: "Failed to submit" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
