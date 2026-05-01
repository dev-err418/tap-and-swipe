/**
 * Scaffold a new draft episode.
 *
 * Usage:
 *   npx tsx scripts/new-draft.ts                # untitled
 *   npx tsx scripts/new-draft.ts "My title"     # with title
 *
 * Writes content/drafts/{id}.mdx with empty frontmatter and prints the
 * preview URLs. The draft renders at /drafts/{id} (noindex, not listed).
 * Promote with: npx tsx scripts/publish-draft.ts {id} {final-slug}
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const DRAFTS_DIR = path.join(process.cwd(), "content", "drafts");
fs.mkdirSync(DRAFTS_DIR, { recursive: true });

const id = crypto.randomBytes(4).toString("hex"); // 8 hex chars
const title = process.argv.slice(2).join(" ") || "Untitled draft";
const today = new Date().toISOString().slice(0, 10);
const recorded = today.slice(0, 7); // YYYY-MM

const filePath = path.join(DRAFTS_DIR, `${id}.mdx`);

const scaffold = `---
title: "${title.replace(/"/g, '\\"')}"
description: ""
date: "${today}"
guest: ""
guestInfo:
  name: ""
  photo: ""
  role: ""
  twitter: ""
youtubeId: ""
appSlug: ""
appStoreId: ""
playStoreId: ""
revenueAtRecording: ""
recordedAt: "${recorded}"
tags: []
image: ""
---

Body goes here.
`;

fs.writeFileSync(filePath, scaffold);

console.log(`✓ Draft created: ${path.relative(process.cwd(), filePath)}`);
console.log(`  Local:  http://localhost:3000/drafts/${id}`);
console.log(`  Live:   https://tap-and-swipe.com/drafts/${id}`);
console.log(`\nWhen ready:  npx tsx scripts/publish-draft.ts ${id} <final-slug>`);
