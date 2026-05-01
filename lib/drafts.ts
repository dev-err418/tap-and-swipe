import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Episode } from "./episodes";

const DRAFTS_DIR = path.join(process.cwd(), "content", "drafts");

export function getDraftById(id: string): Episode | null {
  // Reject anything other than [a-z0-9-_] to keep filesystem traversal out.
  if (!/^[a-z0-9_-]+$/i.test(id)) return null;

  const filePath = path.join(DRAFTS_DIR, `${id}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    title: data.title || "Untitled draft",
    description: data.description || "",
    date: data.date || new Date().toISOString().slice(0, 10),
    guest: data.guest,
    guestInfo: data.guestInfo,
    youtubeId: data.youtubeId,
    appSlug: data.appSlug,
    appStoreId: data.appStoreId,
    playStoreId: data.playStoreId,
    revenueAtRecording: data.revenueAtRecording,
    recordedAt: data.recordedAt,
    tags: data.tags,
    image: data.image,
    caseStudySlug: data.caseStudySlug,
    slug: id,
    content,
  };
}
