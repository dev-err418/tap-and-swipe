/**
 * Upload a local MP4 to Cloudflare R2 and assign it to a lesson.
 *
 * Usage:
 *   npx tsx scripts/upload-lesson-video.ts <lessonId> <localPath> [r2Key]
 *
 * Example:
 *   npx tsx scripts/upload-lesson-video.ts seed-getting-started-1 \
 *     /tmp/lesson-videos/welcome-to-the-roadmap.mp4 \
 *     getting-started/welcome-to-the-roadmap.mp4
 *
 * If r2Key is omitted, defaults to <category>/<basename>.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

import { createReadStream, statSync } from "node:fs";
import { basename } from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE,
} = process.env;

function bail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function main() {
  const lessonId = process.argv[2];
  const localPath = process.argv[3];
  const explicitKey = process.argv[4];

  if (!lessonId || !localPath) {
    bail("Usage: npx tsx scripts/upload-lesson-video.ts <lessonId> <localPath> [r2Key]");
  }
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_BASE) {
    bail("Missing R2_* env vars in .env.local");
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) bail(`Lesson not found: ${lessonId}`);

  const stats = statSync(localPath);
  const sizeMb = (stats.size / 1024 / 1024).toFixed(1);
  const key = explicitKey ?? `${lesson.category}/${basename(localPath)}`;

  console.log(`Uploading ${localPath} (${sizeMb} MB) → r2://${R2_BUCKET}/${key}`);

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: R2_BUCKET,
      Key: key,
      Body: createReadStream(localPath),
      ContentType: "video/mp4",
      CacheControl: "public, max-age=31536000, immutable",
    },
  });

  upload.on("httpUploadProgress", (p) => {
    if (p.loaded && p.total) {
      const pct = ((p.loaded / p.total) * 100).toFixed(0);
      process.stdout.write(`\r  ${pct}% (${(p.loaded / 1024 / 1024).toFixed(1)} MB)`);
    }
  });

  await upload.done();
  process.stdout.write("\n");

  const publicUrl = `${R2_PUBLIC_BASE.replace(/\/$/, "")}/${key}`;
  console.log(`Uploaded → ${publicUrl}`);

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { videoUrl: publicUrl },
  });

  console.log(`Lesson ${lessonId} videoUrl set.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
