const PLATFORM_MAP: Record<string, string> = {
  "linkedin.com": "LinkedIn",
  "www.linkedin.com": "LinkedIn",
  "x.com": "X",
  "twitter.com": "X",
  "www.twitter.com": "X",
  "instagram.com": "Instagram",
  "www.instagram.com": "Instagram",
  "youtube.com": "YouTube",
  "www.youtube.com": "YouTube",
  "m.youtube.com": "YouTube",
  "tiktok.com": "TikTok",
  "www.tiktok.com": "TikTok",
  "reddit.com": "Reddit",
  "www.reddit.com": "Reddit",
  "github.com": "GitHub",
  "www.github.com": "GitHub",
  "discord.com": "Discord",
  "www.discord.com": "Discord",
};

export function detectPlatform(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return PLATFORM_MAP[hostname] ?? "Other";
  } catch {
    return "Other";
  }
}
