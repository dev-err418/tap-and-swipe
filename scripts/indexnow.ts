/**
 * Submit URLs to IndexNow (Bing, Yandex, etc.) for instant indexation.
 *
 * Usage:
 *   npx tsx scripts/indexnow.ts                    # submit all sitemap URLs
 *   npx tsx scripts/indexnow.ts /explore /app-store # submit specific paths
 */

const HOST = "https://tap-and-swipe.com";
const KEY = "5606c40ceb2be232110cc3ac6f7233bb";

async function getSitemapUrls(): Promise<string[]> {
  const res = await fetch(`${HOST}/sitemap.xml`);
  const xml = await res.text();
  const urls: string[] = [];
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    urls.push(match[1]);
  }
  return urls;
}

async function main() {
  const args = process.argv.slice(2);

  const urlList =
    args.length > 0
      ? args.map((p) => `${HOST}${p.startsWith("/") ? p : `/${p}`}`)
      : await getSitemapUrls();

  if (urlList.length === 0) {
    console.log("No URLs to submit.");
    return;
  }

  console.log(`Submitting ${urlList.length} URL(s) to IndexNow...`);

  const body = {
    host: "tap-and-swipe.com",
    key: KEY,
    keyLocation: `${HOST}/${KEY}.txt`,
    urlList,
  };

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  console.log(`Response: ${res.status} ${res.statusText}`);
  if (!res.ok) {
    const text = await res.text();
    console.error(text);
    process.exit(1);
  }

  console.log("Done.");
}

main();
