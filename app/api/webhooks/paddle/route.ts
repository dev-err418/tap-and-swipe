import { NextRequest, NextResponse } from "next/server";
import {
  EventName,
  type SubscriptionNotification,
} from "@paddle/paddle-node-sdk";
import { paddle } from "@/lib/paddle";
import { prisma } from "@/lib/prisma";
import { addToGuild, addRole, removeRole } from "@/lib/discord";
import { sendDiscordNotification } from "@/lib/discord-webhook";

function formatCountry(countryCode?: string): string {
  if (!countryCode) return "\u{1F310} Unknown";
  const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  const fullName = regionNames.of(countryCode) || countryCode;
  const flag = countryCode
    .toUpperCase()
    .replace(/./g, (char: string) =>
      String.fromCodePoint(char.charCodeAt(0) + 127397)
    );
  return `${flag} ${fullName}`;
}

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(price);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("paddle-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = await paddle.webhooks.unmarshal(
      body,
      process.env.PADDLE_WEBHOOK_SECRET!,
      signature
    );
  } catch (err) {
    console.error("[paddle] Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.eventType) {
      case EventName.SubscriptionActivated: {
        const sub = event.data as SubscriptionNotification;
        const discordId = (sub.customData as Record<string, string>)?.discordId;
        if (!discordId) {
          console.warn(
            `[paddle] subscription.activated — no discordId in customData, skipping. sub=${sub.id}`
          );
          break;
        }

        const dbUser = await prisma.user.findUnique({
          where: { discordId },
        });

        let roleAdded = false;
        if (dbUser?.discordAccessToken) {
          const addedToGuild = await addToGuild(
            discordId,
            dbUser.discordAccessToken
          );
          if (addedToGuild) {
            roleAdded = await addRole(discordId);
          } else {
            console.warn(
              `[paddle] subscription.activated — addToGuild failed for ${discordId}`
            );
            roleAdded = await addRole(discordId);
          }
        } else {
          roleAdded = await addRole(discordId);
        }

        if (!roleAdded) {
          console.warn(
            `[paddle] subscription.activated — addRole returned false for ${discordId}`
          );
        }

        await prisma.user.upsert({
          where: { discordId },
          update: {
            subscriptionId: sub.id,
            subscriptionStatus: "active",
            paddleCustomerId: sub.customerId,
            paymentProvider: "paddle",
            roleGranted: roleAdded,
          },
          create: {
            discordId,
            discordUsername: discordId,
            subscriptionId: sub.id,
            subscriptionStatus: "active",
            paddleCustomerId: sub.customerId,
            paymentProvider: "paddle",
            roleGranted: roleAdded,
          },
        });

        // Fire DataFast goal
        const datafastVisitorId = (sub.customData as Record<string, string>)
          ?.datafast_visitor_id;
        if (datafastVisitorId && process.env.DATAFAST_API_KEY) {
          fetch("https://datafa.st/api/v1/goals", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.DATAFAST_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              datafast_visitor_id: datafastVisitorId,
              name: "paddle_checkout_completed",
            }),
          }).catch(() => {});
        }

        // Discord notification (best-effort, never blocks webhook)
        try {
          let countryCode: string | undefined;
          try {
            const address = await paddle.addresses.get(
              sub.customerId!,
              sub.addressId!
            );
            countryCode = address.countryCode ?? undefined;
          } catch {
            console.warn("[paddle] Failed to fetch address for notification");
          }

          const countryDisplay = formatCountry(countryCode);

          const unitPrice = sub.items?.[0]?.price?.unitPrice;
          const priceAmount = unitPrice
            ? Number(unitPrice.amount) / 100
            : 0;
          const currency = unitPrice?.currencyCode ?? "EUR";
          const priceDisplay = formatPrice(priceAmount, currency);

          const activeCount = await prisma.user.count({
            where: { subscriptionStatus: "active" },
          });
          const mrr = activeCount * priceAmount;
          const mrrDisplay = formatPrice(mrr, currency);

          await sendDiscordNotification(
            "\u{1F9D1}\u{200D}\u{1F4BB} [Tap & Swipe] New subscription",
            undefined,
            [
              { name: "MRR", value: mrrDisplay, inline: false },
              { name: "Country", value: countryDisplay, inline: false },
              { name: "Earnings", value: priceDisplay, inline: false },
            ]
          );
        } catch (err) {
          console.error("[paddle] Discord notification failed:", err);
        }

        console.log(
          `[paddle] subscription.activated — discordId=${discordId} sub=${sub.id} roleGranted=${roleAdded}`
        );
        break;
      }

      case EventName.SubscriptionUpdated: {
        const sub = event.data as SubscriptionNotification;
        const discordId = (sub.customData as Record<string, string>)?.discordId;
        if (!discordId) break;

        const isActive = ["active", "trialing"].includes(sub.status);

        let roleGranted = false;
        if (isActive) {
          roleGranted = await addRole(discordId);
          if (!roleGranted) {
            console.warn(
              `[paddle] subscription.updated — addRole returned false for ${discordId}`
            );
          }
        } else {
          await removeRole(discordId);
        }

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionStatus: sub.status,
            roleGranted,
          },
        });

        console.log(
          `[paddle] subscription.updated — discordId=${discordId} status=${sub.status}`
        );
        break;
      }

      case EventName.SubscriptionCanceled: {
        const sub = event.data as SubscriptionNotification;
        const discordId = (sub.customData as Record<string, string>)?.discordId;
        if (!discordId) break;

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionStatus: "canceled",
            subscriptionId: null,
            roleGranted: false,
          },
        });

        await removeRole(discordId);

        console.log(
          `[paddle] subscription.canceled — discordId=${discordId}`
        );
        break;
      }

      case EventName.SubscriptionPastDue: {
        const sub = event.data as SubscriptionNotification;
        const discordId = (sub.customData as Record<string, string>)?.discordId;
        if (!discordId) break;

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionStatus: "past_due",
            roleGranted: false,
          },
        });

        await removeRole(discordId);

        console.log(
          `[paddle] subscription.past_due — discordId=${discordId}`
        );
        break;
      }

      case EventName.TransactionCompleted: {
        // Logged for analytics — role granting handled by subscription events
        console.log(
          `[paddle] transaction.completed — eventId=${event.eventId}`
        );
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[paddle] Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
