/**
 * Validate that published articles meet the technical floor for Google Discover.
 *
 * Hard rules (errors, exit 1):
 *   - Case studies must declare `image` and `imageAlt` in frontmatter.
 *   - The `image` must resolve to a real file in `public/`.
 *   - That file must be at least 1200px wide (Discover's documented minimum).
 *
 * Soft rules (warnings, exit 0):
 *   - title length > 90 (Discover often truncates around there on mobile)
 *   - description length > 160
 *   - imageAlt length < 15 (likely a placeholder)
 *
 * Episodes are checked for title/description length only. Their hero is the
 * YouTube `maxresdefault.jpg` (1280×720), which clears the floor.
 *
 * Usage:
 *   npx tsx scripts/seo/check-discover-readiness.ts                  # check all published
 *   npx tsx scripts/seo/check-discover-readiness.ts <file>...        # check specific files
 *
 * Programmatic:
 *   import { checkFile, checkAll } from "./check-discover-readiness";
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import sharp from "sharp";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const EPISODES_DIR = path.join(ROOT, "content", "episodes");
const CASE_STUDIES_DIR = path.join(ROOT, "content", "case-studies");
const DRAFTS_DIR = path.join(ROOT, "content", "drafts");

const TITLE_SOFT_MAX = 90;
const DESCRIPTION_SOFT_MAX = 160;
const ALT_SOFT_MIN = 15;
const IMAGE_HARD_MIN_WIDTH = 1200;

export type Issue = { kind: "error" | "warning"; message: string };
export type Kind = "episode" | "case-study";

export interface CheckResult {
  file: string;
  kind: Kind;
  issues: Issue[];
}

function detectKind(file: string, frontmatter?: Record<string, unknown>): Kind | null {
  const abs = path.resolve(file);
  if (abs.startsWith(EPISODES_DIR)) return "episode";
  if (abs.startsWith(CASE_STUDIES_DIR)) return "case-study";
  if (abs.startsWith(DRAFTS_DIR)) {
    // Mirror lib/drafts.ts: a draft becomes a case study by default, episode
    // only if `type: "episode"` is set in frontmatter.
    return frontmatter?.type === "episode" ? "episode" : "case-study";
  }
  return null;
}

async function checkImage(imagePath: string): Promise<Issue[]> {
  const issues: Issue[] = [];
  const isExternal = /^https?:\/\//.test(imagePath);
  if (isExternal) {
    issues.push({
      kind: "warning",
      message: `image is external (${imagePath}), can't validate dimensions locally`,
    });
    return issues;
  }
  const abs = path.join(PUBLIC_DIR, imagePath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) {
    issues.push({ kind: "error", message: `image file not found at ${abs}` });
    return issues;
  }
  try {
    const meta = await sharp(abs).metadata();
    if (!meta.width) {
      issues.push({ kind: "error", message: `couldn't read width of ${imagePath}` });
    } else if (meta.width < IMAGE_HARD_MIN_WIDTH) {
      issues.push({
        kind: "error",
        message: `image ${imagePath} is ${meta.width}px wide, Discover requires >=${IMAGE_HARD_MIN_WIDTH}px`,
      });
    }
  } catch (err) {
    issues.push({
      kind: "error",
      message: `failed to read image ${imagePath}: ${(err as Error).message}`,
    });
  }
  return issues;
}

export async function checkFile(file: string): Promise<CheckResult> {
  const raw = fs.readFileSync(file, "utf-8");
  const { data } = matter(raw);
  const kind = detectKind(file, data);
  if (!kind) {
    return {
      file,
      kind: "case-study",
      issues: [{ kind: "error", message: `not under content/episodes, content/case-studies, or content/drafts` }],
    };
  }
  const issues: Issue[] = [];

  const title = (data.title as string | undefined) ?? "";
  const description = (data.description as string | undefined) ?? "";
  const image = data.image as string | undefined;
  const imageAlt = data.imageAlt as string | undefined;

  if (!title) issues.push({ kind: "error", message: "missing title" });
  if (!description) issues.push({ kind: "error", message: "missing description" });

  if (title.length > TITLE_SOFT_MAX) {
    issues.push({
      kind: "warning",
      message: `title is ${title.length} chars (>${TITLE_SOFT_MAX}), likely truncated in Discover`,
    });
  }
  if (description.length > DESCRIPTION_SOFT_MAX) {
    issues.push({
      kind: "warning",
      message: `description is ${description.length} chars (>${DESCRIPTION_SOFT_MAX})`,
    });
  }

  if (kind === "case-study") {
    if (!image) {
      issues.push({ kind: "error", message: "case studies require an `image` for Discover" });
    } else {
      issues.push(...(await checkImage(image)));
    }
    if (!imageAlt) {
      issues.push({ kind: "error", message: "case studies require an `imageAlt`" });
    } else if (imageAlt.length < ALT_SOFT_MIN) {
      issues.push({
        kind: "warning",
        message: `imageAlt is only ${imageAlt.length} chars, likely a placeholder`,
      });
    }
  }

  return { file, kind, issues };
}

export async function checkAll(): Promise<CheckResult[]> {
  const files: string[] = [];
  if (fs.existsSync(EPISODES_DIR)) {
    for (const f of fs.readdirSync(EPISODES_DIR)) {
      if (f.endsWith(".mdx")) files.push(path.join(EPISODES_DIR, f));
    }
  }
  if (fs.existsSync(CASE_STUDIES_DIR)) {
    for (const f of fs.readdirSync(CASE_STUDIES_DIR)) {
      if (f.endsWith(".mdx")) files.push(path.join(CASE_STUDIES_DIR, f));
    }
  }
  const results: CheckResult[] = [];
  for (const f of files) results.push(await checkFile(f));
  return results;
}

export function summarize(results: CheckResult[]): { errors: number; warnings: number } {
  let errors = 0;
  let warnings = 0;
  for (const r of results) {
    for (const i of r.issues) {
      if (i.kind === "error") errors++;
      else warnings++;
    }
  }
  return { errors, warnings };
}

function printResults(results: CheckResult[]): void {
  for (const r of results) {
    if (r.issues.length === 0) continue;
    const rel = path.relative(ROOT, r.file);
    console.log(`\n${rel}`);
    for (const i of r.issues) {
      const tag = i.kind === "error" ? "✗" : "!";
      console.log(`  ${tag} ${i.message}`);
    }
  }
}

async function main(): Promise<void> {
  const argFiles = process.argv.slice(2);
  const results = argFiles.length
    ? await Promise.all(argFiles.map((f) => checkFile(path.resolve(f))))
    : await checkAll();

  printResults(results);
  const { errors, warnings } = summarize(results);
  const checked = results.length;
  console.log(
    `\n${checked} file${checked === 1 ? "" : "s"} checked, ${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.`
  );
  process.exit(errors > 0 ? 1 : 0);
}

const invokedDirectly =
  process.argv[1] && path.basename(process.argv[1]).startsWith("check-discover-readiness");
if (invokedDirectly) {
  main();
}
