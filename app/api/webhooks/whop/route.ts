import { NextRequest, NextResponse } from "next/server";
import { getWhop, WHOP_STARTER_PLAN_ID, WHOP_COMMUNITY_PLAN_ID } from "@/lib/whop";
import { prisma } from "@/lib/prisma";
import { addToGuild, addRole, removeRole } from "@/lib/discord";
import {
  generateAsoLicenseWhop,
  deactivateAsoLicensesByWhop,
  reactivateAsoLicensesByWhop,
} from "@/lib/aso-db";
import { sendLicenseKeyEmail } from "@/lib/aso-email";

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

function extractPlanId(d: Record<string, unknown>): string | undefined {
  // membership payload: data.plan = { id, ... }
  // payment payload:    data.plan = { id, ... }; data.membership = { id, status } only
  const plan = d.plan;
  if (typeof plan === "string" && plan.length > 0) return plan;
  if (
    plan &&
    typeof plan === "object" &&
    typeof (plan as Record<string, unknown>).id === "string"
  ) {
    return (plan as Record<string, string>).id;
  }
  return undefined;
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

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const whop = getWhop();
  let webhookData: ReturnType<typeof whop.webhooks.unwrap>;

  try {
    webhookData = whop.webhooks.unwrap(bodyText, { headers });
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
    const tier: "full" | "starter" =
      extractMetadataTier(data) ??
      (membershipForMeta ? extractMetadataTier(membershipForMeta) : null) ??
      tierFromPlanId(planIdFromPayload) ??
      "full";
    const asoPlan = tier === "starter" ? "solo" : "pro";
    const emailSource = tier === "starter" ? "community-starter" : "community";

    // Fallback 1: check metadata.discordId (set during our checkout flow)
    if (!discord) {
      discord = extractDiscordFromMetadata(data);
    }

    // For payment events, the metadata lives on the nested membership object
    if (!discord) {
      const membership = data.membership as Record<string, unknown> | undefined;
      if (membership) {
        discord = extractDiscord(membership) ?? extractDiscordFromMetadata(membership);
      }
    }

    // Fallback 2: fetch from Whop API when webhook payload lacks discord data
    if (!discord) {
      const membershipIdForLookup =
        (data.id as string | undefined) ??
        ((data.membership as Record<string, unknown> | undefined)?.id as string | undefined);
      if (membershipIdForLookup) {
        discord = await fetchDiscordFromWhop(membershipIdForLookup);
      }
    }

    switch (webhookData.type) {
      case "membership.activated": {
        const membershipId = String(data.id);
        const email = extractEmail(data);
        const manageUrl = data.manage_url as string | undefined;

        // Discord role granting
        if (discord) {
          const existingUser = await prisma.user.findUnique({
            where: { discordId: discord.id },
          });

          // Add user to guild using stored OAuth access token, then assign role
          if (existingUser?.discordAccessToken) {
            await addToGuild(discord.id, existingUser.discordAccessToken).catch(
              (err) =>
                console.warn(
                  `[whop] addToGuild failed for ${discord.id}:`,
                  err
                )
            );
          } else {
            console.warn(
              `[whop] No access token stored for ${discord.id} — cannot add to guild`
            );
          }

          // Plan upgrade/downgrade: if the stored tier differs from the
          // freshly-resolved tier, remove the old role before granting the new one.
          const previousTier =
            existingUser?.tier === "starter" || existingUser?.tier === "full"
              ? existingUser.tier
              : null;
          if (previousTier && previousTier !== tier) {
            await removeRole(discord.id, previousTier).catch((err) =>
              console.warn(
                `[whop] Failed to remove old ${previousTier} role for ${discord.id}:`,
                err
              )
            );
            console.log(
              `[whop] Plan change detected — ${previousTier} → ${tier} for ${discord.id}`
            );
          }

          const roleGranted = await addRole(discord.id, tier);
          if (!roleGranted) {
            console.warn(
              `[whop] addRole returned false for ${discord.id} — user may not be in the guild`
            );
          }

          const isNew = !existingUser;
          const isActiveElsewhere =
            existingUser &&
            existingUser.paymentProvider !== "whop" &&
            existingUser.paymentProvider !== null &&
            existingUser.subscriptionStatus === "active";

          await prisma.user.upsert({
            where: { discordId: discord.id },
            update: {
              subscriptionStatus: "active",
              roleGranted,
              tier,
              ...(!isActiveElsewhere && { paymentProvider: "whop" }),
              ...(visitorId && !existingUser?.visitorId && { visitorId }),
            },
            create: {
              discordId: discord.id,
              discordUsername: discord.username,
              subscriptionStatus: "active",
              paymentProvider: "whop",
              roleGranted,
              tier,
              ...(visitorId && { visitorId }),
            },
          });

          // ASO license generation (Pro tier only — Community tier has no ASO)
          if (email && tier === "full") {
            const { key: licenseKey, isNew: isNewLicense } =
              await generateAsoLicenseWhop(email, membershipId, asoPlan, manageUrl);

            if (isNewLicense || isNew) {
              await sendLicenseKeyEmail(
                email,
                licenseKey,
                emailSource,
                manageUrl
              );
            }
          }

          console.log(
            `[whop] membership.activated — discordId=${discord.id} roleGranted=${roleGranted}`
          );
        } else {
          // No Discord — still generate ASO license if we have email and Pro tier
          if (email && tier === "full") {
            const { key: licenseKey, isNew: isNewLicense } =
              await generateAsoLicenseWhop(email, membershipId, asoPlan, manageUrl);

            if (isNewLicense) {
              await sendLicenseKeyEmail(email, licenseKey, emailSource, manageUrl);
            }
          }

          console.warn(
            `[whop] membership.activated — no Discord ID found. membership=${membershipId}`
          );
        }
        break;
      }

      case "membership.deactivated": {
        const membershipId = String(data.id);

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
            if (email) {
              const { key: licenseKey, isNew: isNewLicense } =
                await generateAsoLicenseWhop(email, membershipId, "pro");
              if (isNewLicense) {
                await sendLicenseKeyEmail(email, licenseKey, "community");
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
