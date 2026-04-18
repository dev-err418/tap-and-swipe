export interface GuestInfo {
  name: string;
  photo?: string;
  role?: string;
  twitter?: string;
  linkedin?: string;
  threads?: string;
  mastodon?: string;
  website?: string;
}

export function calculateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
