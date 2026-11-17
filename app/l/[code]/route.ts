import { NextResponse } from "next/server";
import { parseLessonShortCode } from "@/lib/roadmap";

const NOINDEX_HEADERS = { "X-Robots-Tag": "noindex, nofollow" };

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const parsed = parseLessonShortCode(code);
  const base = "https://appsprint.app";
  const target = parsed
    ? (() => {
        const url = new URL(`/community/learn/classroom/${parsed.slug}`, base);
        url.searchParams.set("lesson", parsed.lessonId);
        return url;
      })()
    : new URL("/community/learn/classroom", base);
  return NextResponse.redirect(target, { status: 302, headers: NOINDEX_HEADERS });
}
