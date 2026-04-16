import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token === process.env.MOBILE_API_KEY;
}

// GET /api/mobile/shows/episodes
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .order("scheduled_date", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/mobile/shows/episodes
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const { data, error } = await supabase
    .from("episodes")
    .insert({
      guest_id: body.guest_id ?? null,
      title: body.title,
      scheduled_date: body.scheduled_date ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
