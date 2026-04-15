import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const listmonkUrl = process.env.LISTMONK_URL;
  const listUuid = process.env.LISTMONK_LIST_UUID;

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

  return NextResponse.json({ ok: true });
}
