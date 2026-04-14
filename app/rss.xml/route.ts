import { getAllEpisodes } from "@/lib/episodes";

const BASE_URL = "https://tap-and-swipe.com";

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const episodes = getAllEpisodes();

  const items = episodes
    .map(
      (ep) => `    <item>
      <title>${escapeXml(ep.title)}</title>
      <link>${BASE_URL}/episodes/${ep.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/episodes/${ep.slug}</guid>
      <description>${escapeXml(ep.description)}</description>
      <pubDate>${new Date(ep.date).toUTCString()}</pubDate>${
        ep.tags
          ? ep.tags.map((t) => `\n      <category>${escapeXml(t)}</category>`).join("")
          : ""
      }
    </item>`
    )
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tap &amp; Swipe — Episodes</title>
    <link>${BASE_URL}</link>
    <description>Real stories from people building mobile apps.</description>
    <language>en</language>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
