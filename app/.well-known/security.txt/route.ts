const SECURITY_TXT = [
  "Contact: mailto:arthur@tap-and-swipe.com",
  "Expires: 2027-05-01T00:00:00Z",
  "Preferred-Languages: en",
  "Canonical: https://tap-and-swipe.com/.well-known/security.txt",
  "",
].join("\n");

export const dynamic = "force-static";
export const runtime = "nodejs";

export function GET() {
  return new Response(SECURITY_TXT, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
