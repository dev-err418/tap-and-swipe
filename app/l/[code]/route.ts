import { NextResponse } from "next/server";
import { parseLessonShortCode } from "@/lib/roadmap";
import { SITE_URL } from "@/lib/seo/author";

const NOINDEX_HEADERS = { "X-Robots-Tag": "noindex, nofollow" };

function publicBase(req: Request): string {
  // Prefer the proxy-forwarded host so redirects land on the public origin
  // rather than the Docker container's internal address (Coolify sets
  // x-forwarded-host).
  const xfHost = req.headers.get("x-forwarded-host");
  if (xfHost) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${xfHost}`;
  }
  if (process.env.NODE_ENV === "development") {
    return new URL(req.url).origin;
  }
  return SITE_URL;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const parsed = parseLessonShortCode(code);
  const base = publicBase(req);
  const target = parsed
    ? (() => {
        const url = new URL(`/learn/classroom/${parsed.slug}`, base);
        url.searchParams.set("lesson", parsed.lessonId);
        return url;
      })()
    : new URL("/learn/classroom", base);
  return NextResponse.redirect(target, { status: 302, headers: NOINDEX_HEADERS });
}
