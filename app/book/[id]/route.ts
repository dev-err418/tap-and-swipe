import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /book/:id?type=intro|recording
// Public redirect: tap-and-swipe.com/book/<episode_id>?type=intro
// → cal.com/<username>/<slug>?metadata[episode_id]=<id>&metadata[type]=<type>
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "intro";

  const username = process.env.CALCOM_USERNAME;
  const slug =
    type === "intro"
      ? process.env.CALCOM_INTRO_EVENT_SLUG
      : process.env.CALCOM_EVENT_SLUG;

  if (!username || !slug) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Verify episode exists
  const { data } = await supabase
    .from("episodes")
    .select("id")
    .eq("id", id)
    .single();

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const calUrl = `https://cal.com/${username}/${slug}?metadata[episode_id]=${id}&metadata[type]=${type}`;

  return NextResponse.redirect(calUrl);
}
