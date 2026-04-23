import { NextRequest, NextResponse } from "next/server";
import { getWhop } from "@/lib/whop";
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
    function extractTier(d: Record<string, unknown>): "full" | "starter" {
      const metadata = d.metadata as Record<string, unknown> | undefined;
      const t = metadata?.tier;
      return t === "starter" ? "starter" : "full";
    }
    const membershipForMeta = data.membership as Record<string, unknown> | undefined;
    const visitorId =
      extractVisitorId(data) ??
      (membershipForMeta ? extractVisitorId(membershipForMeta) : null);
    const tier: "full" | "starter" =
      extractTier(data) === "starter"
        ? "starter"
        : membershipForMeta
          ? extractTier(membershipForMeta)
          : "full";
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

          // ASO license generation (Pro for full, Solo for starter)
          if (email) {
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
          // No Discord — still generate ASO license if we have email
          if (email) {
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

          // Re-grant Discord role (look up stored tier)
          if (discord) {
            const existingUser = await prisma.user.findUnique({
              where: { discordId: discord.id },
              select: { tier: true },
            });
            const userTier = existingUser?.tier === "starter" ? "starter" : "full";
            await addRole(discord.id, userTier).catch(() => {});

            await prisma.user.update({
              where: { discordId: discord.id },
              data: {
                subscriptionStatus: "active",
                roleGranted: true,
              },
            }).catch(() => {});
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
