export const dynamic = "force-static";
export const runtime = "nodejs";

export function GET() {
  return new Response("Email address protection requires JavaScript.\n", {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
