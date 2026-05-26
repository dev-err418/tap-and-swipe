import { NextResponse } from "next/server";

const WHOP_MEMBERSHIPS_URL = "https://whop.com/@me/settings/memberships/";

export async function GET() {
  return NextResponse.redirect(WHOP_MEMBERSHIPS_URL);
}

export async function POST() {
  return NextResponse.json({
    url: WHOP_MEMBERSHIPS_URL,
    provider: "whop",
  });
}
