import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { detectPlatform } from "@/lib/detect-platform";

function isAuthorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token === process.env.MOBILE_API_KEY;
}

// GET /api/mobile/leads
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/mobile/leads
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const url: string = body.url;

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const platform = detectPlatform(url);

  const { data, error } = await supabase
    .from("leads")
    .insert({ url, platform, status: "cold" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
