import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthorized(req: Request): boolean {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  return token === process.env.MOBILE_API_KEY;
}

// PATCH /api/mobile/shows/episodes/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.title !== undefined) updates.title = body.title;
  if (body.contact_method !== undefined) updates.contact_method = body.contact_method;
  if (body.contact_handle !== undefined) updates.contact_handle = body.contact_handle;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.youtube_url !== undefined) updates.youtube_url = body.youtube_url;
  if (body.blog_url !== undefined) updates.blog_url = body.blog_url;

  // Pipeline: merge partial updates into existing pipeline
  if (body.pipeline !== undefined) {
    // Fetch current pipeline first
    const { data: current } = await supabase
      .from("episodes")
      .select("pipeline")
      .eq("id", id)
      .single();

    if (current) {
      updates.pipeline = { ...(current.pipeline as object), ...body.pipeline };
    } else {
      updates.pipeline = body.pipeline;
    }
  }

  const { data, error } = await supabase
    .from("episodes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/mobile/shows/episodes/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase.from("episodes").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
