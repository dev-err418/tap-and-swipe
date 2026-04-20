import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { addToGuild, addRole, removeRole } from "@/lib/discord";
import { sendFraudAlert } from "@/lib/discord-webhook";
import { isDisposableEmail } from "@/lib/fraud";
import { generateAsoLicense, deactivateAsoLicenses, reactivateAsoLicenses } from "@/lib/aso-db";
import { sendLicenseKeyEmail } from "@/lib/aso-email";

function isCommunitySubscription(sub: Stripe.Subscription): boolean {
  return !!sub.metadata.discordId;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Only handle subscription mode
        if (session.mode !== "subscription" || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Only handle community subscriptions
        if (!isCommunitySubscription(subscription)) break;

        const discordId = subscription.metadata.discordId;

        // Look up the stored access token to add user to guild
        const dbUser = await prisma.user.findUnique({ where: { discordId } });
        let roleAdded = false;

        if (dbUser?.discordAccessToken) {
          const addedToGuild = await addToGuild(discordId, dbUser.discordAccessToken);
          if (addedToGuild) {
            roleAdded = await addRole(discordId);
          } else {
            console.warn(`[checkout.session.completed] addToGuild failed for ${discordId} — token may be expired`);
            roleAdded = await addRole(discordId);
          }
        } else {
          console.warn(`[checkout.session.completed] No access token stored for ${discordId} — cannot add to guild`);
          roleAdded = await addRole(discordId);
        }

        if (!roleAdded) {
          console.warn(`[checkout.session.completed] addRole returned false for ${discordId} — user may not be in the guild`);
        }

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            stripeCustomerId: session.customer as string,
            roleGranted: roleAdded,
          },
        });

        // Generate ASO Pro license (included with Community)
        const communityCustomerEmail = session.customer_details?.email;
        if (communityCustomerEmail) {
          const { key: licenseKey, isNew } = await generateAsoLicense(communityCustomerEmail, session.customer as string, "pro");
          if (isNew) await sendLicenseKeyEmail(communityCustomerEmail, licenseKey, "community");
        }

        // Track community paid event
        const communityVisitorId = subscription.metadata.visitorId || discordId;
        {
          const communityInvoice =
            typeof subscription.latest_invoice === "string"
              ? await stripe.invoices.retrieve(subscription.latest_invoice)
              : subscription.latest_invoice;
          await prisma.pageEvent.upsert({
            where: { sessionId_type_product: { sessionId: communityVisitorId, type: "paid", product: "community" } },
            create: {
              product: "community",
              type: "paid",
              visitorId: communityVisitorId,
              sessionId: communityVisitorId,
              stripeCustomerId: session.customer as string,
              revenue: communityInvoice?.amount_paid ?? null,
              currency: communityInvoice?.currency ?? null,
              country: subscription.metadata.country || null,
            },
            update: {},
          }).catch((e) => console.error("[Community] PageEvent upsert error:", e));
        }

        // Disposable email check
        const communityEmail = session.customer_details?.email;
        if (communityEmail && isDisposableEmail(communityEmail)) {
          console.warn(
            `Disposable email detected: ${communityEmail} — refunding and revoking`
          );

          // Refund the latest invoice payment
          const latestInvoice = subscription.latest_invoice;
          const invoiceId =
            typeof latestInvoice === "string"
              ? latestInvoice
              : latestInvoice?.id;
          if (invoiceId) {
            try {
              const invoicePayments = await stripe.invoicePayments.list({
                invoice: invoiceId,
              });
              const payment = invoicePayments.data[0]?.payment;
              if (payment?.payment_intent) {
                const piId =
                  typeof payment.payment_intent === "string"
                    ? payment.payment_intent
                    : payment.payment_intent.id;
                await stripe.refunds.create({ payment_intent: piId });
              }
            } catch (refundErr) {
              console.error(`[disposable-email] Refund failed for invoice ${invoiceId}:`, refundErr);
              await sendFraudAlert(
                "Refund Failed — Manual Action Required",
                `Auto-refund failed for disposable email. Please refund manually.`,
                [
                  { name: "Email", value: communityEmail, inline: true },
                  { name: "Invoice", value: invoiceId, inline: true },
                  { name: "Discord ID", value: discordId, inline: true },
                ]
              );
            }
          }

          // Cancel subscription
          await stripe.subscriptions.cancel(subscription.id);

          // Update DB and remove role
          await prisma.user.update({
            where: { discordId },
            data: {
              subscriptionStatus: "canceled",
              subscriptionId: null,
              roleGranted: false,
            },
          });
          await removeRole(discordId);
          await deactivateAsoLicenses(session.customer as string);

          await sendFraudAlert(
            "Disposable Email Detected",
            `Payment from disposable email was auto-refunded.`,
            [
              { name: "Email", value: communityEmail, inline: true },
              { name: "Customer", value: session.customer as string, inline: true },
              { name: "Discord ID", value: discordId, inline: true },
            ]
          );
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        if (!isCommunitySubscription(subscription)) break;

        const discordId = subscription.metadata.discordId;

        const isActive = ["active", "trialing"].includes(subscription.status);
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

        let roleGranted = false;
        if (isActive) {
          roleGranted = await addRole(discordId);
          if (!roleGranted) {
            console.warn(`[customer.subscription.updated] addRole returned false for ${discordId} — user may not be in the guild`);
          }
          await reactivateAsoLicenses(customerId);
        } else {
          await removeRole(discordId);
          await deactivateAsoLicenses(customerId);
        }

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionStatus: subscription.status,
            roleGranted,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        if (!isCommunitySubscription(subscription)) break;

        const discordId = subscription.metadata.discordId;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionStatus: "canceled",
            subscriptionId: null,
            roleGranted: false,
          },
        });

        await removeRole(discordId);
        await deactivateAsoLicenses(customerId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetails = invoice.parent?.subscription_details;
        const subscriptionId =
          typeof subDetails?.subscription === "string"
            ? subDetails.subscription
            : subDetails?.subscription?.id;
        if (!subscriptionId) break;

        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        if (!isCommunitySubscription(subscription)) break;

        const discordId = subscription.metadata.discordId;

        const failedCustomerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionStatus: "past_due",
            roleGranted: false,
          },
        });

        await removeRole(discordId);
        await deactivateAsoLicenses(failedCustomerId);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetails = invoice.parent?.subscription_details;
        const subscriptionId =
          typeof subDetails?.subscription === "string"
            ? subDetails.subscription
            : subDetails?.subscription?.id;
        if (!subscriptionId) break;

        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);
        if (!isCommunitySubscription(subscription)) break;
        if (!["active", "trialing"].includes(subscription.status)) break;

        const discordId = subscription.metadata.discordId;
        if (!discordId) break;

        const roleAdded = await addRole(discordId);
        if (!roleAdded) {
          console.warn(`[invoice.paid] addRole returned false for ${discordId} — user may not be in the guild`);
        }

        const paidCustomerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;
        await reactivateAsoLicenses(paidCustomerId);

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionStatus: subscription.status,
            roleGranted: roleAdded,
          },
        });
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription" || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        if (!isCommunitySubscription(subscription)) break;

        const discordId = subscription.metadata.discordId;

        const asyncDbUser = await prisma.user.findUnique({ where: { discordId } });
        let asyncRoleAdded = false;

        if (asyncDbUser?.discordAccessToken) {
          await addToGuild(discordId, asyncDbUser.discordAccessToken);
          asyncRoleAdded = await addRole(discordId);
        } else {
          asyncRoleAdded = await addRole(discordId);
        }

        if (!asyncRoleAdded) {
          console.warn(`[checkout.session.async_payment_succeeded] addRole returned false for ${discordId} — user may not be in the guild`);
        }

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            stripeCustomerId: session.customer as string,
            roleGranted: asyncRoleAdded,
          },
        });
        break;
      }

      case "radar.early_fraud_warning.created": {
        const warning = event.data.object as Stripe.Radar.EarlyFraudWarning;
        const chargeId =
          typeof warning.charge === "string"
            ? warning.charge
            : warning.charge.id;

        const charge = await stripe.charges.retrieve(chargeId);

        if (!charge.refunded) {
          try {
            await stripe.refunds.create({ charge: chargeId });
          } catch (refundErr) {
            console.error(`[radar.early_fraud_warning] Refund failed for charge ${chargeId}:`, refundErr);
            await sendFraudAlert(
              "Refund Failed — Manual Action Required",
              `Auto-refund failed for early fraud warning. Please refund manually.`,
              [
                { name: "Charge", value: chargeId, inline: true },
                { name: "Amount", value: `$${((charge.amount ?? 0) / 100).toFixed(2)}`, inline: true },
                { name: "Fraud Type", value: warning.fraud_type, inline: true },
              ]
            );
          }

          // Find user and revoke access
          const customerId =
            typeof charge.customer === "string"
              ? charge.customer
              : charge.customer?.id;

          if (customerId) {
            const user = await prisma.user.findUnique({
              where: { stripeCustomerId: customerId },
            });

            if (user) {
              if (user.subscriptionId) {
                await stripe.subscriptions.cancel(user.subscriptionId);
              }

              await prisma.user.update({
                where: { stripeCustomerId: customerId },
                data: {
                  subscriptionStatus: "canceled",
                  subscriptionId: null,
                  roleGranted: false,
                },
              });

              if (user.discordId) await removeRole(user.discordId);
            }
            await deactivateAsoLicenses(customerId);
          }

          await sendFraudAlert(
            "Early Fraud Warning — Auto-Refunded",
            `Stripe Radar detected a stolen card. Charge was automatically refunded.`,
            [
              { name: "Charge", value: chargeId, inline: true },
              {
                name: "Amount",
                value: `$${((charge.amount ?? 0) / 100).toFixed(2)}`,
                inline: true,
              },
              {
                name: "Customer",
                value: (typeof charge.customer === "string" ? charge.customer : charge.customer?.id) ?? "Unknown",
                inline: true,
              },
              {
                name: "Fraud Type",
                value: warning.fraud_type,
                inline: true,
              },
            ]
          );
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId =
          typeof dispute.charge === "string"
            ? dispute.charge
            : dispute.charge?.id ?? "Unknown";

        const disputeCharge = typeof dispute.charge === "string"
          ? await stripe.charges.retrieve(dispute.charge)
          : dispute.charge;

        const customerId =
          typeof disputeCharge?.customer === "string"
            ? disputeCharge.customer
            : disputeCharge?.customer?.id;

        if (customerId) {
          const user = await prisma.user.findUnique({
            where: { stripeCustomerId: customerId },
          });

          if (user) {
            if (user.subscriptionId) {
              await stripe.subscriptions.cancel(user.subscriptionId);
            }

            await prisma.user.update({
              where: { stripeCustomerId: customerId },
              data: {
                subscriptionStatus: "canceled",
                subscriptionId: null,
                roleGranted: false,
              },
            });

            if (user.discordId) await removeRole(user.discordId);
          }
          await deactivateAsoLicenses(customerId);
        }

        await sendFraudAlert(
          "Dispute Created",
          `A customer has filed a chargeback dispute.`,
          [
            { name: "Charge", value: chargeId, inline: true },
            {
              name: "Amount",
              value: `$${(dispute.amount / 100).toFixed(2)}`,
              inline: true,
            },
            {
              name: "Reason",
              value: dispute.reason ?? "Unknown",
              inline: true,
            },
            {
              name: "Customer",
              value: customerId ?? "Unknown",
              inline: true,
            },
          ]
        );
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
