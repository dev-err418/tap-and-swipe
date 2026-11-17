import { createHmac, timingSafeEqual } from "node:crypto";

export function signCourseRequest(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`community-course:v1:${timestamp}:${body}`).digest("hex");
}

export function verifyCourseRequest(secret: string | undefined, timestamp: string | null, signature: string | null, body: string, now = Date.now()) {
  if (!secret || !timestamp || !signature || !/^\d{13}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  if (Math.abs(now - Number(timestamp)) > 60_000) return false;
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(signCourseRequest(secret, timestamp, body), "hex"));
}
