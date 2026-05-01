import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const platform = request.nextUrl.searchParams.get("platform");
  const appIds = request.nextUrl.searchParams.get("app_ids");

  if (platform !== "ios" && platform !== "android") {
    return NextResponse.json({ error: "platform must be ios or android" }, { status: 400 });
  }
  if (!appIds) {
    return NextResponse.json({ error: "app_ids is required" }, { status: 400 });
  }

  const upstream = `https://app.sensortower.com/api/${platform}/apps?app_ids=${encodeURIComponent(appIds)}`;
  const res = await fetch(upstream);
  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}
