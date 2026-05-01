import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Episode } from "./episodes";
import type { CaseStudy } from "./case-studies";
import { calculateReadingTime } from "./content";

const DRAFTS_DIR = path.join(process.cwd(), "content", "drafts");

// A draft renders either as a case study (default, the long-form review
// shape) or an episode shell. Pick by setting `type: "episode"` in the
// frontmatter; anything else falls through to case-study.
export type Draft =
  | { kind: "case-study"; data: CaseStudy }
  | { kind: "episode"; data: Episode };

export function getDraftById(id: string): Draft | null {
  if (!/^[a-z0-9_-]+$/i.test(id)) return null;

  const filePath = path.join(DRAFTS_DIR, `${id}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const kind: Draft["kind"] = data.type === "episode" ? "episode" : "case-study";

  if (kind === "episode") {
    const episode: Episode = {
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
    return { kind, data: episode };
  }

  const caseStudy: CaseStudy = {
    title: data.title || "Untitled draft",
    description: data.description || "",
    date: data.date || new Date().toISOString().slice(0, 10),
    updatedDate: data.updatedDate,
    image: data.image,
    imageAlt: data.imageAlt,
    guest: data.guest,
    guestInfo: data.guestInfo,
    tags: data.tags,
    appSlug: data.appSlug,
    appStoreId: data.appStoreId,
    playStoreId: data.playStoreId,
    revenueAtRecording: data.revenueAtRecording,
    recordedAt: data.recordedAt,
    episodeSlug: data.episodeSlug,
    readingTime: calculateReadingTime(content),
    slug: id,
    content,
  };
  return { kind, data: caseStudy };
}
