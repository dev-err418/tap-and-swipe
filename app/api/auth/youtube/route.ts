import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAuthUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (session?.discordId !== process.env.ADMIN_DISCORD_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(getAuthUrl());
}
