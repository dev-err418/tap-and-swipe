import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cfHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    if (key.startsWith("cf-") || key.startsWith("x-forwarded") || key === "x-real-ip") {
      cfHeaders[key] = value;
    }
  });

  return NextResponse.json({ headers: cfHeaders });
}
