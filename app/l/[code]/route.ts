import { NextResponse } from "next/server";
import { parseLessonShortCode } from "@/lib/roadmap";

const NOINDEX_HEADERS = { "X-Robots-Tag": "noindex, nofollow" };

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const parsed = parseLessonShortCode(code);
  const target = parsed
    ? (() => {
        const url = new URL(`/learn/classroom/${parsed.slug}`, _req.url);
        url.searchParams.set("lesson", parsed.lessonId);
        return url;
      })()
    : new URL("/learn/classroom", _req.url);
  return NextResponse.redirect(target, { status: 302, headers: NOINDEX_HEADERS });
}
