import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/subscriptions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
        send_welcome_email: true,
        utm_source: "tapandswipe",
        utm_medium: "website",
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error("beehiiv error:", res.status, body);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
