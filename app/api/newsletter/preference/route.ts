import { NextResponse } from "next/server";

// Server-side proxy to Plunk's public contact endpoints. Plunk's CORS only
// allows its own subdomains, so we tunnel client requests through here.

const PLUNK_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function plunkUrl(): string | null {
  return process.env.PLUNK_API_URL ?? null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const url = plunkUrl();
  if (!url) {
    return NextResponse.json({ error: "Newsletter not configured" }, { status: 500 });
  }
  try {
    const res = await fetchWithTimeout(`${url}/contacts/public/${encodeURIComponent(id)}`, {}, PLUNK_TIMEOUT_MS);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Plunk public contact fetch error:", res.status, body);
      return NextResponse.json({ error: "Contact not found" }, { status: res.status === 404 ? 404 : 500 });
    }
    const data = (await res.json()) as { id: string; email: string; subscribed: boolean };
    return NextResponse.json({
      id: data.id,
      email: data.email,
      subscribed: data.subscribed,
    });
  } catch (err) {
    console.error("Plunk public contact fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { id?: string; subscribed?: boolean } | null;
  if (!body?.id || typeof body.subscribed !== "boolean") {
    return NextResponse.json({ error: "Missing id or subscribed flag" }, { status: 400 });
  }
  const url = plunkUrl();
  if (!url) {
    return NextResponse.json({ error: "Newsletter not configured" }, { status: 500 });
  }
  const action = body.subscribed ? "subscribe" : "unsubscribe";
  try {
    const res = await fetchWithTimeout(
      `${url}/contacts/public/${encodeURIComponent(body.id)}/${action}`,
      { method: "POST" },
      PLUNK_TIMEOUT_MS
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`Plunk public ${action} error:`, res.status, errBody);
      return NextResponse.json({ error: `Failed to ${action}` }, { status: 500 });
    }
    const data = (await res.json()) as { id: string; email: string; subscribed: boolean };
    return NextResponse.json({
      id: data.id,
      email: data.email,
      subscribed: data.subscribed,
    });
  } catch (err) {
    console.error(`Plunk public ${action} error:`, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
