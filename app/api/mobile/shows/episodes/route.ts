import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { copyTemplateForGuest } from "@/lib/google-docs";

function isAuthorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token === process.env.MOBILE_API_KEY;
}

function buildCalUrl(episodeId: string): string | null {
  const username = process.env.CALCOM_USERNAME;
  const slug = process.env.CALCOM_EVENT_SLUG;
  if (!username || !slug) return null;
  return `https://cal.com/${username}/${slug}?metadata[episode_id]=${episodeId}`;
}

// GET /api/mobile/shows/episodes
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .order("created_at", { ascending: true });

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
      name: body.name,
      title: body.name,
      contact_method: body.contact_method ?? null,
      contact_handle: body.contact_handle ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-generate Google Doc (non-blocking)
  try {
    const docUrl = await copyTemplateForGuest(data.name);
    if (docUrl) {
      await supabase.from("episodes").update({ doc_url: docUrl }).eq("id", data.id);
      data.doc_url = docUrl;
    }
  } catch (err) {
    console.error("[episodes] Failed to create prep sheet:", err);
  }

  // Generate Cal.com booking link
  const calUrl = buildCalUrl(data.id);
  if (calUrl) {
    await supabase.from("episodes").update({ cal_url: calUrl }).eq("id", data.id);
    data.cal_url = calUrl;
  }

  return NextResponse.json(data, { status: 201 });
}
