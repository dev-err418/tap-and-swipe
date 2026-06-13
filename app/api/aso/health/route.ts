import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const DEFAULT_ASO_API_BASE_URL = "https://api.tap-and-swipe.com";

function getAsoApiBaseUrl() {
  return (
    process.env.ASO_EDGE_API_BASE_URL ??
    process.env.ASO_API_BASE_URL ??
    DEFAULT_ASO_API_BASE_URL
  ).replace(/\/+$/, "");
}

export async function GET() {
  const session = await getSession();
  if (session?.discordId !== process.env.ADMIN_DISCORD_ID) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const res = await fetch(`${getAsoApiBaseUrl()}/health`, {
      cache: "no-store",
    });
    return NextResponse.json(await res.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch health", message: String(e) },
      { status: 502 }
    );
  }
}
