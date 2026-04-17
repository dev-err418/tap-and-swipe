import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token === process.env.MOBILE_API_KEY;
}

// GET /api/mobile/leads/today
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Start of today in CEST (UTC+2)
  const now = new Date();
  const cestOffset = 2 * 60 * 60 * 1000;
  const cestNow = new Date(now.getTime() + cestOffset);
  const startOfDayCEST = new Date(
    Date.UTC(cestNow.getUTCFullYear(), cestNow.getUTCMonth(), cestNow.getUTCDate())
  );
  const startUtc = new Date(startOfDayCEST.getTime() - cestOffset);

  const { count, error } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startUtc.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
