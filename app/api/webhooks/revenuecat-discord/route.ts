import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sendRevenueCatEmbed,
  editRevenueCatMessage,
  type DiscordEmbed,
} from "@/lib/revenuecat-discord";

const COLOR_GREEN = 5793266;
const COLOR_GOLD = 15844367;
const COLOR_RED = 15158332;

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

function formatPrice(price?: number, currency?: string): string {
  if (!price || !currency) return "";
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).format(price);
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== process.env.REVENUECAT_SECRET) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { event } = body;
    const { searchParams } = new URL(req.url);
    const appName = searchParams.get("app_name") || event.app_id;

    // Idempotency: skip if we already processed this event
    const eventId = event.id;
    if (eventId) {
      const existing = await prisma.revenueCatEvent.findUnique({
        where: { eventId },
      });
      if (existing) {
        return new NextResponse("Already processed", { status: 200 });
      }
    }

    // Classify event
    const isTrial =
      event.type === "TRIAL_STARTED" ||
      (event.type === "INITIAL_PURCHASE" && event.period_type === "TRIAL");
    const isTrialConversion =
      event.type === "RENEWAL" && event.is_trial_conversion === true;
    const isRenewal =
      event.type === "RENEWAL" && event.is_trial_conversion !== true;
    const isTrialCancellation =
      event.type === "CANCELLATION" && event.period_type === "TRIAL";

    // Store event for daily stats (all event types)
    if (eventId) {
      try {
        await prisma.revenueCatEvent.create({
          data: {
            eventId,
            appName,
            eventType: event.type,
            periodType: event.period_type || null,
            productId: event.product_id || null,
            appUserId: event.app_user_id || null,
            price: event.price_in_purchased_currency || 0,
            currency: event.currency || "USD",
            store: event.store || null,
            environment: event.environment || "PRODUCTION",
            rawPayload: body,
          },
        });
      } catch {
        // Unique constraint violation — already processed
      }
    }

    // Only send Discord notifications for trial/conversion/renewal/cancellation
    if (!isTrial && !isTrialConversion && !isRenewal && !isTrialCancellation) {
      return new NextResponse("Event stored", { status: 200 });
    }

    const countryDisplay = formatCountry(event.country_code);

    // Handle trial cancellation — edit original message
    if (isTrialCancellation) {
      const originalTxId = event.original_transaction_id;
      if (originalTxId) {
        const record = await prisma.trialDiscordMessage.findUnique({
          where: {
            appName_originalTransactionId: {
              appName,
              originalTransactionId: originalTxId,
            },
          },
        });

        if (record) {
          const embed: DiscordEmbed = {
            title: `\u{1F534} [${appName}] Trial cancelled`,
            color: COLOR_RED,
            fields: [
              { name: "User ID", value: event.app_user_id, inline: false },
              { name: "Product ID", value: event.product_id, inline: false },
              { name: "Country", value: countryDisplay, inline: false },
            ],
            timestamp: new Date().toISOString(),
          };

          try {
            await editRevenueCatMessage(record.discordMessageId, [embed]);
            await prisma.trialDiscordMessage.delete({
              where: { id: record.id },
            });
          } catch (err) {
            console.error("Failed to edit Discord message:", err);
          }
          return new NextResponse("Trial cancelled message updated", {
            status: 200,
          });
        }
      }
      return new NextResponse("Trial cancellation noted", { status: 200 });
    }

    // Build embed for trial / conversion / renewal
    let title = `\u{1F7E2} [${appName}] Trial started`;
    let color = COLOR_GREEN;
    if (isTrialConversion) {
      title = `\u{1F4B0} [${appName}] Trial converted`;
      color = COLOR_GOLD;
    } else if (isRenewal) {
      title = `\u{1F4B0} [${appName}] Renewed`;
      color = COLOR_GOLD;
    }

    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: "User ID", value: event.app_user_id, inline: false },
      { name: "Product ID", value: event.product_id, inline: false },
      { name: "Country", value: countryDisplay, inline: false },
    ];

    const priceDisplay = formatPrice(
      event.price_in_purchased_currency,
      event.currency
    );
    if ((isTrialConversion || isRenewal) && priceDisplay) {
      fields.push({ name: "Price", value: priceDisplay, inline: false });
    }

    const embed: DiscordEmbed = {
      title,
      color,
      fields,
      timestamp: new Date().toISOString(),
    };

    try {
      const messageId = await sendRevenueCatEmbed([embed]);

      // Store Discord message ID for trials so we can edit on cancellation
      if (isTrial && messageId && event.original_transaction_id) {
        try {
          await prisma.trialDiscordMessage.upsert({
            where: {
              appName_originalTransactionId: {
                appName,
                originalTransactionId: event.original_transaction_id,
              },
            },
            create: {
              appName,
              appUserId: event.app_user_id,
              originalTransactionId: event.original_transaction_id,
              discordMessageId: messageId,
            },
            update: {
              discordMessageId: messageId,
            },
          });
        } catch (err) {
          console.error("Failed to store trial message ID:", err);
        }
      }
    } catch (err) {
      console.error("Failed to send Discord embed:", err);
    }

    return new NextResponse("Notification sent", { status: 200 });
  } catch (error) {
    console.error("RevenueCat webhook error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
