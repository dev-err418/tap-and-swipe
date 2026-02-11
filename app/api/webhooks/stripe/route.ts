import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { addRole, removeRole } from "@/lib/discord";
import { sendFraudAlert } from "@/lib/discord-webhook";
import { isDisposableEmail } from "@/lib/fraud";

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
        if (session.mode !== "subscription" || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const discordId = subscription.metadata.discordId;
        if (!discordId) break;

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            stripeCustomerId: session.customer as string,
            roleGranted: true,
          },
        });

        await addRole(discordId);

        // Fire DataFast goal for Stripe checkout completed
        const datafastVisitorId = session.metadata?.datafast_visitor_id;
        if (datafastVisitorId && process.env.DATAFAST_API_KEY) {
          fetch("https://datafa.st/api/v1/goals", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.DATAFAST_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              datafast_visitor_id: datafastVisitorId,
              name: "stripe_checkout_completed",
            }),
          }).catch(() => {}); // fire-and-forget, don't block webhook
        }

        // Disposable email check
        const customerEmail = session.customer_details?.email;
        if (customerEmail && isDisposableEmail(customerEmail)) {
          console.warn(
            `Disposable email detected: ${customerEmail} — refunding and revoking`
          );

          // Refund the latest invoice payment
          const latestInvoice = subscription.latest_invoice;
          const invoiceId =
            typeof latestInvoice === "string"
              ? latestInvoice
              : latestInvoice?.id;
          if (invoiceId) {
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

          await sendFraudAlert(
            "Disposable Email Detected",
            `Payment from disposable email was auto-refunded.`,
            [
              { name: "Email", value: customerEmail, inline: true },
              { name: "Customer", value: session.customer as string, inline: true },
              { name: "Discord ID", value: discordId, inline: true },
            ]
          );
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const discordId = subscription.metadata.discordId;
        if (!discordId) break;

        const isActive = ["active", "trialing"].includes(subscription.status);

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionStatus: subscription.status,
            roleGranted: isActive,
          },
        });

        if (isActive) {
          await addRole(discordId);
        } else {
          await removeRole(discordId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const discordId = subscription.metadata.discordId;
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
        const discordId = subscription.metadata.discordId;
        if (!discordId) break;

        await prisma.user.update({
          where: { discordId },
          data: {
            subscriptionStatus: "past_due",
            roleGranted: false,
          },
        });

        await removeRole(discordId);
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
          await stripe.refunds.create({ charge: chargeId });

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
              // Cancel any active subscription
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

              await removeRole(user.discordId);
            }
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
                value: customerId ?? "Unknown",
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

        // Find user by customer and revoke access
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

            await removeRole(user.discordId);
          }
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
