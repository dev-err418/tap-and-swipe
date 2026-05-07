/**
 * Upload an arbitrary file to Cloudflare R2 and print the public URL.
 *
 * Usage:
 *   npx tsx scripts/upload-r2.ts <localPath> <r2Key>
 *
 * Example:
 *   npx tsx scripts/upload-r2.ts /tmp/before-call.mp4 join/before-call.mp4
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

import { createReadStream, statSync } from "node:fs";
import { extname } from "node:path";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_BASE,
} = process.env;

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function bail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

async function main() {
  const localPath = process.argv[2];
  const key = process.argv[3];

  if (!localPath || !key) {
    bail("Usage: npx tsx scripts/upload-r2.ts <localPath> <r2Key>");
  }
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_BASE) {
    bail("Missing R2_* env vars in .env.local");
  }

  const stats = statSync(localPath);
  const sizeMb = (stats.size / 1024 / 1024).toFixed(1);
  const contentType = CONTENT_TYPES[extname(localPath).toLowerCase()] ?? "application/octet-stream";

  console.log(`Uploading ${localPath} (${sizeMb} MB, ${contentType}) → r2://${R2_BUCKET}/${key}`);

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
      ContentType: contentType,
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
