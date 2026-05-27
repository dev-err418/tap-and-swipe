import { NextRequest, NextResponse } from "next/server";
import { Whop } from "@whop/sdk";
import {
  asoPlanFromWhopPlanId,
  getWhop,
  WHOP_ASO_PRODUCT_ID,
  WHOP_STARTER_PLAN_ID,
  WHOP_COMMUNITY_PLAN_ID,
} from "@/lib/whop";
import { prisma } from "@/lib/prisma";
import { addRole, removeRole } from "@/lib/discord";
import {
  type AsoPlan,
  generateAsoLicenseWhop,
  deactivateAsoLicensesByWhop,
  reactivateAsoLicensesByWhop,
} from "@/lib/aso-db";
import { sendLicenseKeyEmail } from "@/lib/aso-email";
import { grantAccess } from "@/lib/grant-access";

type WhopWebhookData = ReturnType<ReturnType<typeof getWhop>["webhooks"]["unwrap"]>;

const WHOP_MEMBERSHIPS_URL = "https://whop.com/@me/settings/memberships/";

function extractDiscord(data: Record<string, unknown>): {
  id: string;
  username: string;
} | null {
  const discord = data.discord;
  if (
    typeof discord === "object" &&
    discord !== null &&
    "id" in (discord as Record<string, unknown>)
  ) {
    const d = discord as Record<string, string>;
    return { id: String(d.id), username: d.username ?? String(d.id) };
  }
  if (typeof discord === "string" && discord.length > 0) {
    return { id: discord, username: discord };
  }
  return null;
}

function extractDiscordFromMetadata(
  data: Record<string, unknown>
): { id: string; username: string } | null {
  const metadata = data.metadata as Record<string, unknown> | undefined;
  if (!metadata) return null;
  const discordId = metadata.discordId;
  if (typeof discordId === "string" && discordId.length > 0) {
    return { id: discordId, username: discordId };
  }
  return null;
}

function extractEmail(data: Record<string, unknown>): string | undefined {
  // v1 SDK-typed shape: data.user.email (user is an object)
  const user = data.user;
  if (typeof user === "object" && user !== null) {
    const nested = (user as Record<string, unknown>).email;
    if (typeof nested === "string" && nested.length > 0) return nested;
  }
  // v2 shape: data.email at top level (user is a string ID)
  const top = data.email;
  if (typeof top === "string" && top.length > 0) return top;
  return undefined;
}

function extractStringId(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (
    value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).id === "string"
  ) {
    return (value as Record<string, string>).id;
  }
  return undefined;
}

function extractPlanId(d: Record<string, unknown>): string | undefined {
  // membership payload: data.plan = { id, ... }
  // payment payload:    data.plan = { id, ... }; data.membership = { id, status } only
  return extractStringId(d.plan) ?? extractStringId(d.plan_id);
}

function extractProductId(d: Record<string, unknown>): string | undefined {
  return (
    extractStringId(d.product) ??
    extractStringId(d.product_id) ??
    extractStringId(d.access_pass) ??
    extractStringId(d.access_pass_id)
  );
}

function extractManageUrl(data: Record<string, unknown>): string | undefined {
  return typeof data.manage_url === "string" && data.manage_url.length > 0
    ? data.manage_url
    : undefined;
}

function tierFromPlanId(
  planId: string | undefined
): "full" | "starter" | null {
  if (!planId) return null;
  if (planId === WHOP_STARTER_PLAN_ID) return "starter";
  if (planId === WHOP_COMMUNITY_PLAN_ID) return "full";
  return null;
}

async function fetchDiscordFromWhop(
  membershipId: string
): Promise<{ id: string; username: string } | null> {
  const res = await fetch(
    `https://api.whop.com/api/v2/memberships/${membershipId}`,
    {
      headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}` },
    }
  );
  if (!res.ok) {
    console.warn(
      `[whop] fetchDiscordFromWhop failed — status=${res.status} membership=${membershipId}`
    );
    return null;
  }
  const json = await res.json();
  return extractDiscord(json as Record<string, unknown>);
}

function unwrapWhopWebhook(
  bodyText: string,
  headers: Record<string, string>
): WhopWebhookData {
  const configs = [
    {
      label: "default",
      apiKey: process.env.WHOP_API_KEY,
      secret: process.env.WHOP_WEBHOOK_SECRET,
    },
    {
      label: "aso",
      apiKey: process.env.WHOP_ASO_API_KEY,
      secret: process.env.WHOP_ASO_WEBHOOK_SECRET,
    },
    {
      label: "community",
      apiKey: process.env.WHOP_COMMUNITY_API_KEY,
      secret: process.env.WHOP_COMMUNITY_WEBHOOK_SECRET,
    },
  ];
  const seen = new Set<string>();
  let lastError: unknown;

  for (const config of configs) {
    if (!config.apiKey || !config.secret) continue;
    const key = `${config.apiKey}:${config.secret}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const whop =
        config.label === "default"
          ? getWhop()
          : new Whop({
              apiKey: config.apiKey,
              webhookKey: btoa(config.secret),
            });
      return whop.webhooks.unwrap(bodyText, { headers });
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("No Whop webhook secret configured");
}

async function ensureStandaloneAsoLicense({
  email,
  membershipId,
  plan,
  manageUrl,
}: {
  email: string | undefined;
  membershipId: string;
  plan: AsoPlan;
  manageUrl?: string;
}): Promise<void> {
  if (!email) {
    console.warn(
      `[whop] ASO license not generated — missing email. membership=${membershipId}`
    );
    return;
  }

  const { key: licenseKey, isNew: isNewLicense } =
    await generateAsoLicenseWhop(email, membershipId, plan, manageUrl);
  if (isNewLicense) {
    const emailSent = await sendLicenseKeyEmail(
      email,
      licenseKey,
      "aso",
      manageUrl
    );
    if (!emailSent) {
      console.warn(
        `[whop] ASO license generated but email failed. membership=${membershipId} email=${email}`
      );
    }
  }
}

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let webhookData: WhopWebhookData;

  try {
    webhookData = unwrapWhopWebhook(bodyText, headers);
  } catch (err) {
    console.error("[whop] Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    // The discord field exists on the actual payload but isn't in the SDK types
    const data = webhookData.data as unknown as Record<string, unknown>;
    let discord = extractDiscord(data);

    // Extract visitorId from metadata (set by our checkout route) for analytics attribution
    function extractVisitorId(d: Record<string, unknown>): string | null {
      const metadata = d.metadata as Record<string, unknown> | undefined;
      const v = metadata?.visitorId;
      return typeof v === "string" && v.length > 0 ? v : null;
    }
    function extractMetadataTier(
      d: Record<string, unknown>
    ): "full" | "starter" | null {
      const metadata = d.metadata as Record<string, unknown> | undefined;
      const t = metadata?.tier;
      if (t === "starter") return "starter";
      if (t === "full") return "full";
      return null;
    }
    const membershipForMeta = data.membership as Record<string, unknown> | undefined;
    const visitorId =
      extractVisitorId(data) ??
      (membershipForMeta ? extractVisitorId(membershipForMeta) : null);
    // Resolve tier in priority order:
    //   1. metadata.tier from our /api/checkout flow (top-level or nested under membership)
    //   2. plan.id from the webhook payload (covers direct-on-Whop signups)
    //   3. fallback to "full"
    const planIdFromPayload =
      extractPlanId(data) ??
      (membershipForMeta ? extractPlanId(membershipForMeta) : undefined);
    const productIdFromPayload =
      extractProductId(data) ??
      (membershipForMeta ? extractProductId(membershipForMeta) : undefined);
    const standaloneAsoPlan = asoPlanFromWhopPlanId(planIdFromPayload);
    const isStandaloneAsoPurchase =
      productIdFromPayload === WHOP_ASO_PRODUCT_ID || standaloneAsoPlan !== null;
    const tier: "full" | "starter" =
      extractMetadataTier(data) ??
      (membershipForMeta ? extractMetadataTier(membershipForMeta) : null) ??
      tierFromPlanId(planIdFromPayload) ??
      "full";
    const asoPlan = tier === "starter" ? "solo" : "pro";
    const emailSource = tier === "starter" ? "community-starter" : "community";

    if (!isStandaloneAsoPurchase) {
      // Fallback 1: check metadata.discordId (set during our checkout flow)
      if (!discord) {
        discord = extractDiscordFromMetadata(data);
      }

      // For payment events, the metadata lives on the nested membership object
      if (!discord) {
        const membership = data.membership as Record<string, unknown> | undefined;
        if (membership) {
          discord =
            extractDiscord(membership) ?? extractDiscordFromMetadata(membership);
        }
      }

      // Fallback 2: fetch from Whop API when webhook payload lacks discord data
      if (!discord) {
        const membershipIdForLookup =
          (data.id as string | undefined) ??
          ((data.membership as Record<string, unknown> | undefined)?.id as
            | string
            | undefined);
        if (membershipIdForLookup) {
          discord = await fetchDiscordFromWhop(membershipIdForLookup);
        }
      }
    }

    switch (webhookData.type) {
      case "membership.activated": {
        const membershipId = String(data.id);
        const email = extractEmail(data);
        const manageUrl = extractManageUrl(data) ?? WHOP_MEMBERSHIPS_URL;

        if (isStandaloneAsoPurchase) {
          await ensureStandaloneAsoLicense({
            email,
            membershipId,
            plan: standaloneAsoPlan ?? "pro",
            manageUrl,
          });
          console.log(
            `[whop] ASO membership.activated — membership=${membershipId} plan=${standaloneAsoPlan ?? "pro"} email=${email ?? "(none)"}`
          );
          break;
        }

        if (discord) {
          await grantAccess({
            discordId: discord.id,
            discordUsername: discord.username,
            tier,
            email,
            whopMembershipId: membershipId,
            manageUrl,
            visitorId: visitorId ?? undefined,
            source: "whop-webhook",
          });
        } else {
          // No Discord linked yet — generate ASO license if we have email and
          // Pro tier, AND create a placeholder User row so the bot can claim
          // it when the user later links Discord and joins the guild.
          if (email && tier === "full") {
            const { key: licenseKey, isNew: isNewLicense } =
              await generateAsoLicenseWhop(email, membershipId, asoPlan, manageUrl);
            if (isNewLicense) {
              await sendLicenseKeyEmail(email, licenseKey, emailSource, manageUrl);
            }
          }

          // Claim an existing row by whopMembershipId first, then by email
          // (covers users who already have a User record from a prior signup,
          // quiz lead, or earlier Whop sub) before falling through to create.
          const existingByWhop = await prisma.user.findUnique({
            where: { whopMembershipId: membershipId },
          });
          const existingByEmail =
            !existingByWhop && email
              ? await prisma.user.findUnique({ where: { email } })
              : null;
          const existing = existingByWhop ?? existingByEmail;

          if (existing) {
            const isActiveElsewhere =
              existing.paymentProvider !== "whop" &&
              existing.paymentProvider !== null &&
              existing.subscriptionStatus === "active";
            await prisma.user.update({
              where: { id: existing.id },
              data: {
                subscriptionStatus: "active",
                tier,
                whopMembershipId: membershipId,
                ...(email && existing.email !== email && { email }),
                ...(!isActiveElsewhere && { paymentProvider: "whop" }),
                ...(visitorId && !existing.visitorId && { visitorId }),
              },
            });
          } else {
            await prisma.user.create({
              data: {
                whopMembershipId: membershipId,
                subscriptionStatus: "active",
                paymentProvider: "whop",
                roleGranted: false,
                tier,
                ...(email && { email }),
                ...(visitorId && { visitorId }),
              },
            });
          }

          console.warn(
            `[whop] membership.activated — no Discord ID, placeholder User stored. membership=${membershipId} email=${email ?? "(none)"} claimed=${existing ? "existing" : "new"}`
          );
        }
        break;
      }

      case "membership.deactivated": {
        const membershipId = String(data.id);

        if (isStandaloneAsoPurchase) {
          await deactivateAsoLicensesByWhop(membershipId);
          console.log(
            `[whop] ASO membership.deactivated — membership=${membershipId}`
          );
          break;
        }

        // Defensive check: if this deactivation references a different plan
        // than what the user currently has, it's almost certainly a stale
        // "old plan deactivated during plan change" event — skip it so we
        // don't revoke access during an upgrade/downgrade.
        if (discord) {
          const existingUser = await prisma.user.findUnique({
            where: { discordId: discord.id },
            select: { tier: true },
          });
          const storedTier =
            existingUser?.tier === "starter" ? "starter" : "full";
          const eventTier = tierFromPlanId(extractPlanId(data));
          if (eventTier && eventTier !== storedTier) {
            console.log(
              `[whop] membership.deactivated ignored — event tier=${eventTier} but user is on tier=${storedTier} (likely plan change). membership=${membershipId}`
            );
            break;
          }
        }

        // Deactivate ASO licenses
        await deactivateAsoLicensesByWhop(membershipId);

        // Remove Discord role (look up user's tier so we remove the correct role)
        if (discord) {
          const existingUser = await prisma.user.findUnique({
            where: { discordId: discord.id },
            select: { tier: true },
          });
          const userTier = existingUser?.tier === "starter" ? "starter" : "full";
          await removeRole(discord.id, userTier).catch(() => {});

          await prisma.user.update({
            where: { discordId: discord.id },
            data: {
              subscriptionStatus: "canceled",
              roleGranted: false,
            },
          }).catch(() => {});
        }

        console.log(
          `[whop] membership.deactivated — membership=${membershipId} discordId=${discord?.id ?? "unknown"}`
        );
        break;
      }

      case "membership.cancel_at_period_end_changed": {
        console.log(
          `[whop] membership.cancel_at_period_end_changed — membership=${data.id} (still active until period end)`
        );
        break;
      }

      case "payment.succeeded": {
        const membershipId = (data.membership as Record<string, unknown> | undefined)?.id as string | undefined;
        if (membershipId) {
          await reactivateAsoLicensesByWhop(membershipId);

          if (isStandaloneAsoPurchase) {
            const membership = data.membership as Record<string, unknown> | undefined;
            const email =
              extractEmail(data) ??
              (membership ? extractEmail(membership) : undefined);
            const manageUrl =
              extractManageUrl(data) ??
              (membership ? extractManageUrl(membership) : undefined) ??
              WHOP_MEMBERSHIPS_URL;
            await ensureStandaloneAsoLicense({
              email,
              membershipId,
              plan: standaloneAsoPlan ?? "pro",
              manageUrl,
            });
            console.log(
              `[whop] ASO payment.succeeded — membership=${membershipId} plan=${standaloneAsoPlan ?? "pro"}`
            );
            break;
          }

          // Resolve the tier the customer is currently paying for, from the payload.
          // Whop doesn't fire a dedicated plan-change event, so payment.succeeded
          // is the most reliable signal that a plan update happened.
          const payloadTier = tierFromPlanId(extractPlanId(data));

          // Re-grant Discord role and self-heal stored tier on plan change.
          if (discord) {
            const existingUser = await prisma.user.findUnique({
              where: { discordId: discord.id },
              select: { tier: true },
            });
            const storedTier =
              existingUser?.tier === "starter" ? "starter" : "full";
            const eventTier = payloadTier ?? storedTier;

            if (eventTier !== storedTier) {
              await removeRole(discord.id, storedTier).catch((err) =>
                console.warn(
                  `[whop] payment.succeeded — failed to remove old ${storedTier} role:`,
                  err
                )
              );
              console.log(
                `[whop] payment.succeeded — plan change ${storedTier} → ${eventTier} for ${discord.id}`
              );
            }
            await addRole(discord.id, eventTier).catch(() => {});

            await prisma.user.update({
              where: { discordId: discord.id },
              data: {
                subscriptionStatus: "active",
                roleGranted: true,
                ...(eventTier !== storedTier && { tier: eventTier }),
              },
            }).catch(() => {});
          }

          // If the customer is on Pro tier, ensure an ASO license exists.
          // Covers the $99 → $149 upgrade case where Whop may only fire
          // payment.succeeded (no fresh membership.activated). generateAsoLicenseWhop
          // is idempotent on (membership_id, email) so this is safe to call repeatedly.
          if (payloadTier === "full") {
            const email = extractEmail(data);
            const membership = data.membership as Record<string, unknown> | undefined;
            const manageUrl =
              (typeof data.manage_url === "string" ? data.manage_url : undefined) ??
              (typeof membership?.manage_url === "string" ? membership.manage_url : undefined);
            if (email) {
              const { key: licenseKey, isNew: isNewLicense } =
                await generateAsoLicenseWhop(email, membershipId, "pro", manageUrl);
              if (isNewLicense) {
                await sendLicenseKeyEmail(email, licenseKey, "community", manageUrl);
              }
            }
          }
        }
        break;
      }

      case "payment.failed": {
        const membershipId = (data.membership as Record<string, unknown> | undefined)?.id as string | undefined;
        if (membershipId) {
          await deactivateAsoLicensesByWhop(membershipId);

          if (isStandaloneAsoPurchase) {
            console.log(`[whop] ASO payment.failed — membership=${membershipId}`);
            break;
          }

          // Remove Discord role
          if (discord) {
            const existingUser = await prisma.user.findUnique({
              where: { discordId: discord.id },
              select: { tier: true },
            });
            const userTier = existingUser?.tier === "starter" ? "starter" : "full";
            await removeRole(discord.id, userTier).catch(() => {});

            await prisma.user.update({
              where: { discordId: discord.id },
              data: {
                subscriptionStatus: "past_due",
                roleGranted: false,
              },
            }).catch(() => {});
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[whop] Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
