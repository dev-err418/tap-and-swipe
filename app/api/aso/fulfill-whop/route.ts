import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  deactivateAsoLicensesByWhop,
  generateAsoLicenseWhop,
  reactivateAsoLicensesByWhop,
} from "@/lib/aso-db";
import { sendLicenseKeyEmail } from "@/lib/aso-email";

const WHOP_MEMBERSHIPS_URL = "https://whop.com/@me/settings/memberships/";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("activate"),
    eventType: z.string().min(1),
    membershipId: z.string().min(1),
    email: z.string().email(),
    plan: z.enum(["solo", "pro"]).default("pro"),
    manageUrl: z.string().url().optional(),
    reactivateExisting: z.boolean().optional(),
    sendEmail: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("deactivate"),
    eventType: z.string().min(1),
    membershipId: z.string().min(1),
  }),
]);

function getExpectedSecrets(): string[] {
  return [
    process.env.ASO_FULFILLMENT_SECRET,
    process.env.WHOP_ASO_API_KEY,
    process.env.WHOP_API_KEY,
  ].filter((value): value is string => Boolean(value));
}

function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function authorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return false;

  return getExpectedSecrets().some((secret) => timingSafeEqual(token, secret));
}

function maskLicenseKey(key: string): string {
  return `${key.slice(0, 8)}-****-****-${key.slice(-4)}`;
}

function safeWhopManageUrl(value: string | undefined): string {
  if (!value) return WHOP_MEMBERSHIPS_URL;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "whop.com") {
      return WHOP_MEMBERSHIPS_URL;
    }
    return url.pathname.startsWith("/billing/manage/")
      ? url.toString()
      : WHOP_MEMBERSHIPS_URL;
  } catch {
    return WHOP_MEMBERSHIPS_URL;
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fulfillment payload" },
      { status: 400 },
    );
  }

  const body = parsed.data;

  try {
    if (body.action === "deactivate") {
      await deactivateAsoLicensesByWhop(body.membershipId);
      return NextResponse.json({
        action: "license_deactivated",
        eventType: body.eventType,
        membershipId: body.membershipId,
      });
    }

    if (body.reactivateExisting) {
      await reactivateAsoLicensesByWhop(body.membershipId);
    }

    const manageUrl = safeWhopManageUrl(body.manageUrl);
    const { key, isNew } = await generateAsoLicenseWhop(
      body.email,
      body.membershipId,
      body.plan,
      manageUrl,
    );
    const shouldSendEmail = body.sendEmail !== false && isNew;
    const emailSent = shouldSendEmail
      ? await sendLicenseKeyEmail(body.email, key, "aso", manageUrl)
      : false;

    if (shouldSendEmail && !emailSent) {
      console.error("[ASO Whop Fulfillment] License email failed", {
        eventType: body.eventType,
        membershipId: body.membershipId,
        email: body.email,
      });
      return NextResponse.json(
        { error: "License email failed" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      action: isNew ? "license_created" : "license_exists",
      eventType: body.eventType,
      membershipId: body.membershipId,
      email: body.email,
      plan: body.plan,
      emailSent,
      key: maskLicenseKey(key),
    });
  } catch (err) {
    console.error("[ASO Whop Fulfillment] Handler failed:", err);
    return NextResponse.json(
      { error: "Fulfillment failed" },
      { status: 500 },
    );
  }
}
