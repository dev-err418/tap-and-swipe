import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (session?.discordId !== process.env.ADMIN_DISCORD_ID) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const base = "https://api.tap-and-swipe.com";
  try {
    const res = await fetch(`${base}/health`, { next: { revalidate: 0 } });
    return NextResponse.json(await res.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch health", message: String(e) },
      { status: 502 }
    );
  }
}
