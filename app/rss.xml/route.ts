import { getAllCaseStudies } from "@/lib/case-studies";
import { getAllStories } from "@/lib/stories";

const BASE_URL = "https://tap-and-swipe.com";

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface FeedItem {
  title: string;
  slug: string;
  route: string;
  description: string;
  date: string;
  tags?: string[];
}

export function GET() {
  const caseStudies = getAllCaseStudies();
  const stories = getAllStories();

  const feedItems: FeedItem[] = [
    ...caseStudies.map((cs) => ({
      title: cs.title,
      slug: cs.slug,
      route: "case-studies",
      description: cs.description,
      date: cs.date,
      tags: cs.tags,
    })),
    ...stories.map((s) => ({
      title: s.title,
      slug: s.slug,
      route: "stories",
      description: s.description,
      date: s.date,
      tags: s.tags,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const items = feedItems
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${BASE_URL}/${item.route}/${item.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/${item.route}/${item.slug}</guid>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${new Date(item.date).toUTCString()}</pubDate>${
        item.tags
          ? item.tags
              .map((t) => `\n      <category>${escapeXml(t)}</category>`)
              .join("")
          : ""
      }
    </item>`
    )
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Tap &amp; Swipe</title>
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
