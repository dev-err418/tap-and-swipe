import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getWhop } from "@/lib/whop";
import { prisma } from "@/lib/prisma";
import { addToGuild, addRole, removeRole } from "@/lib/discord";
import {
  generateAsoLicenseWhop,
  deactivateAsoLicensesByWhop,
  reactivateAsoLicensesByWhop,
} from "@/lib/aso-db";
import { sendLicenseKeyEmail } from "@/lib/aso-email";
import { sendWelcomeEmail, sendWelcomeBackEmail } from "@/lib/welcome-email";

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

function extractDiscordFromData(data: Record<string, unknown>): {
  id: string;
  username: string;
} | null {
  let discord = extractDiscord(data);
  if (!discord) discord = extractDiscordFromMetadata(data);
  if (!discord) {
    const membership = data.membership as Record<string, unknown> | undefined;
    if (membership) {
      discord = extractDiscord(membership) ?? extractDiscordFromMetadata(membership);
    }
  }
  return discord;
}

/** Find user by email first, then discordId fallback */
async function findUser(email: string | undefined, discordId: string | undefined) {
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) return user;
  }
  if (discordId) {
    const user = await prisma.user.findUnique({ where: { discordId } });
    if (user) return user;
  }
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
    const data = webhookData.data as unknown as Record<string, unknown>;
    const email = extractEmail(data);
    let discord = extractDiscordFromData(data);

    // Fallback: fetch from Whop API when webhook payload lacks discord data
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
        const manageUrl = data.manage_url as string | undefined;

        if (!email) {
          console.warn(
            `[whop] membership.activated — no email found. membership=${membershipId}`
          );
          // Still try Discord-only path for edge case
          if (discord) {
            await handleDiscordOnly(discord, membershipId, manageUrl);
          }
          break;
        }

        // Check if this is a returning customer with an existing Auth.js account
        const existingUser = await prisma.user.findUnique({ where: { email } });
        const hasAuthAccount = existingUser
          ? await prisma.account.findFirst({ where: { userId: existingUser.id } })
          : null;

        // Upsert user by email
        const user = await prisma.user.upsert({
          where: { email },
          update: {
            subscriptionStatus: "active",
            ...(!existingUser?.paymentProvider || existingUser.paymentProvider === "whop"
              ? { paymentProvider: "whop" }
              : {}),
          },
          create: {
            email,
            subscriptionStatus: "active",
            paymentProvider: "whop",
            ...(discord
              ? {
                  discordId: discord.id,
                  discordUsername: discord.username,
                }
              : {}),
          },
        });

        // If returning customer with Auth.js account, skip activation token
        if (hasAuthAccount) {
          await sendWelcomeBackEmail(email).catch((err) =>
            console.error("[whop] Failed to send welcome back email:", err)
          );
        } else {
          // Generate activation token for new users
          const activationToken = randomUUID();
          await prisma.user.update({
            where: { id: user.id },
            data: { activationToken },
          });

          await sendWelcomeEmail(email, activationToken).catch((err) =>
            console.error("[whop] Failed to send welcome email:", err)
          );
        }

        // Discord operations: only if user already has discordId (returning customer)
        if (user.discordId && user.discordAccessToken) {
          await addToGuild(user.discordId, user.discordAccessToken).catch((err) =>
            console.warn(`[whop] addToGuild failed for ${user.discordId}:`, err)
          );
          const roleGranted = await addRole(user.discordId);
          await prisma.user.update({
            where: { id: user.id },
            data: { roleGranted },
          });
        }

        // ASO Pro license generation
        const { key: licenseKey, isNew: isNewLicense } =
          await generateAsoLicenseWhop(email, membershipId, "pro", manageUrl);

        if (isNewLicense || !existingUser) {
          await sendLicenseKeyEmail(email, licenseKey, "community", manageUrl);
        }

        console.log(
          `[whop] membership.activated — email=${email} userId=${user.id} hasAuthAccount=${!!hasAuthAccount}`
        );
        break;
      }

      case "membership.deactivated": {
        const membershipId = String(data.id);

        await deactivateAsoLicensesByWhop(membershipId);

        const user = await findUser(email, discord?.id);
        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: "canceled",
              roleGranted: false,
            },
          });

          if (user.discordId) {
            await removeRole(user.discordId).catch(() => {});
          }
        }

        console.log(
          `[whop] membership.deactivated — membership=${membershipId} userId=${user?.id ?? "unknown"}`
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

          const user = await findUser(email, discord?.id);
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: "active",
                roleGranted: user.discordId ? true : user.roleGranted,
              },
            });

            if (user.discordId) {
              await addRole(user.discordId).catch(() => {});
            }
          }
        }
        break;
      }

      case "payment.failed": {
        const membershipId = (data.membership as Record<string, unknown> | undefined)?.id as string | undefined;
        if (membershipId) {
          await deactivateAsoLicensesByWhop(membershipId);

          const user = await findUser(email, discord?.id);
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: "past_due",
                roleGranted: false,
              },
            });

            if (user.discordId) {
              await removeRole(user.discordId).catch(() => {});
            }
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

/** Legacy fallback: Discord-only activation (no email available) */
async function handleDiscordOnly(
  discord: { id: string; username: string },
  membershipId: string,
  manageUrl: string | undefined
) {
  const existingUser = await prisma.user.findUnique({
    where: { discordId: discord.id },
  });

  if (existingUser?.discordAccessToken) {
    await addToGuild(discord.id, existingUser.discordAccessToken).catch((err) =>
      console.warn(`[whop] addToGuild failed for ${discord.id}:`, err)
    );
  }

  const roleGranted = await addRole(discord.id);

  await prisma.user.upsert({
    where: { discordId: discord.id },
    update: {
      subscriptionStatus: "active",
      roleGranted,
    },
    create: {
      discordId: discord.id,
      discordUsername: discord.username,
      subscriptionStatus: "active",
      paymentProvider: "whop",
      roleGranted,
    },
  });

  // ASO license if we can find email from existing user
  if (existingUser?.email) {
    const { key: licenseKey, isNew } = await generateAsoLicenseWhop(
      existingUser.email,
      membershipId,
      "pro",
      manageUrl
    );
    if (isNew) {
      await sendLicenseKeyEmail(existingUser.email, licenseKey, "community", manageUrl);
    }
  }

  console.log(
    `[whop] membership.activated (discord-only) — discordId=${discord.id} roleGranted=${roleGranted}`
  );
}
