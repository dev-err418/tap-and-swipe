import { createHmac } from "crypto";

const SECRET = "3786b3d02756c858910b8e7ecb05c1b5eaca8b29bbf8fe6ccb08b823b4967764";

export function generateShareToken(): string {
  const ts = Date.now().toString();
  const hmac = createHmac("sha256", SECRET).update(ts).digest("hex");
  return `${ts}.${hmac}`;
}

export function verifyShareToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [ts, hmac] = parts;
  const expected = createHmac("sha256", SECRET).update(ts).digest("hex");
  if (hmac !== expected) return false;

  const age = Date.now() - Number(ts);
  // Must be between 3 seconds and 1 hour old
  return age >= 3_000 && age <= 3_600_000;
}
