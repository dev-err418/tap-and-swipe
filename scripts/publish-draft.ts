/**
 * Promote a draft to a published episode and/or case study.
 *
 * Usage:
 *   npx tsx scripts/publish-draft.ts <draft-id> <slug>                # episode only
 *   npx tsx scripts/publish-draft.ts <draft-id> <slug> --case-study   # case study only
 *   npx tsx scripts/publish-draft.ts <draft-id> <slug> --pair         # both, cross-linked
 *
 * --pair is the typical workflow: the long-form draft body becomes the case
 * study, and a minimal episode shell is created at the same slug with
 * caseStudySlug / episodeSlug cross-links wired up. Edit the episode after
 * to add the youtubeId and any video-specific intro.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const positional = args.filter((a) => !a.startsWith("--"));
const [id, slug] = positional;

if (!id || !slug) {
  console.error(
    "Usage: npx tsx scripts/publish-draft.ts <draft-id> <slug> [--case-study | --pair]"
  );
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`Invalid slug "${slug}" — use lowercase letters, digits, hyphens only.`);
  process.exit(1);
}

const wantCaseStudyOnly = flags.has("--case-study");
const wantPair = flags.has("--pair");
if (wantCaseStudyOnly && wantPair) {
  console.error("Pick one of --case-study or --pair, not both.");
  process.exit(1);
}

const ROOT = process.cwd();
const draftPath = path.join(ROOT, "content", "drafts", `${id}.mdx`);
const episodePath = path.join(ROOT, "content", "episodes", `${slug}.mdx`);
const caseStudyPath = path.join(ROOT, "content", "case-studies", `${slug}.mdx`);

if (!fs.existsSync(draftPath)) {
  console.error(`Draft not found: ${draftPath}`);
  process.exit(1);
}

const willWriteEpisode = !wantCaseStudyOnly;
const willWriteCaseStudy = wantCaseStudyOnly || wantPair;

if (willWriteEpisode && fs.existsSync(episodePath)) {
  console.error(`Episode already exists: ${episodePath}`);
  process.exit(1);
}
if (willWriteCaseStudy && fs.existsSync(caseStudyPath)) {
  console.error(`Case study already exists: ${caseStudyPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(draftPath, "utf-8");
const { data, content } = matter(raw);

// Strip empty-string fields from the scaffold so we don't pollute production
// files with blanks. Arrays and nested objects with all-empty values are also
// dropped for the same reason.
function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (typeof v === "object") {
    return Object.values(v as Record<string, unknown>).every(isEmpty);
  }
  return false;
}
function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isEmpty(v)) continue;
    if (typeof v === "object" && !Array.isArray(v) && v !== null) {
      const nested = clean(v as Record<string, unknown>);
      if (Object.keys(nested).length > 0) out[k as keyof T] = nested as T[keyof T];
    } else {
      out[k as keyof T] = v as T[keyof T];
    }
  }
  return out;
}

const baseFrontmatter = clean(data) as Record<string, unknown>;

function omit<T extends Record<string, unknown>>(obj: T, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!keys.includes(k)) out[k] = v;
  }
  return out;
}

// Episode-shaped frontmatter (drops case-study-only fields)
const episodeFm = omit(baseFrontmatter, ["updatedDate", "imageAlt", "episodeSlug"]);
// Case-study-shaped frontmatter (drops episode-only fields)
const caseStudyFm = omit(baseFrontmatter, ["youtubeId", "caseStudySlug"]);

const written: string[] = [];

if (willWriteEpisode) {
  const fm = { ...episodeFm } as Record<string, unknown>;
  if (willWriteCaseStudy) fm.caseStudySlug = slug;
  // When pairing, the long-form body lives in the case study. The episode
  // gets the description as a single paragraph (a typical short intro), so
  // the page isn't empty before the user sets the youtubeId.
  const body = wantPair ? (data.description as string | undefined) || "" : content;
  const out = matter.stringify(body.trim() ? `\n${body}\n` : "", fm);
  fs.mkdirSync(path.dirname(episodePath), { recursive: true });
  fs.writeFileSync(episodePath, out);
  written.push(path.relative(ROOT, episodePath));
}

if (willWriteCaseStudy) {
  const fm = { ...caseStudyFm } as Record<string, unknown>;
  if (willWriteEpisode) fm.episodeSlug = slug;
  const out = matter.stringify(content.trim() ? `\n${content}\n` : "", fm);
  fs.mkdirSync(path.dirname(caseStudyPath), { recursive: true });
  fs.writeFileSync(caseStudyPath, out);
  written.push(path.relative(ROOT, caseStudyPath));
}

fs.unlinkSync(draftPath);

console.log(`✓ Promoted draft ${id}`);
for (const file of written) console.log(`    ${file}`);
console.log("\nNext steps:");
if (willWriteEpisode) console.log(`  /episodes/${slug}     ← set youtubeId in frontmatter`);
if (willWriteCaseStudy) console.log(`  /case-studies/${slug}`);
console.log("\nIf the frontmatter has appSlug + store IDs, run:");
console.log("  npx tsx scripts/update-app-data.ts");
