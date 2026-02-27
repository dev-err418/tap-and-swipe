import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotification } from "@/lib/discord-webhook";
import {
  generateFollowUpMessage,
  scoreTemperature,
} from "@/lib/quiz-lead-message";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const leads = await prisma.quizLead.findMany({
      where: {
        status: "show",
        showAt: { lt: twentyFourHoursAgo },
        followUpSentAt: null,
      },
    });

    for (const lead of leads) {
      const { whatsappUrlFr, whatsappUrlEn } = generateFollowUpMessage({
        firstName: lead.firstName,
        countryCode: lead.countryCode,
        phone: lead.phone,
      });

      const answers = (lead.answers ?? {}) as Record<string, number>;
      const temperature = scoreTemperature(answers);

      await sendDiscordNotification(
        "🔔 [App Sprint] 24h Follow-Up",
        `It's been 24h since **${lead.firstName}** attended the call. Time to follow up!`,
        [
          { name: "Name", value: lead.firstName, inline: true },
          {
            name: "Phone",
            value: `${lead.countryCode} ${lead.phone}`,
            inline: true,
          },
          { name: "Lead Score", value: temperature, inline: true },
          {
            name: "WhatsApp FR",
            value: `[Envoyer le message](${whatsappUrlFr})`,
            inline: true,
          },
          {
            name: "WhatsApp EN",
            value: `[Send message](${whatsappUrlEn})`,
            inline: true,
          },
        ],
        0xffa500,
      );

      await prisma.quizLead.update({
        where: { id: lead.id },
        data: { followUpSentAt: new Date() },
      });
    }

    return NextResponse.json({ success: true, count: leads.length });
  } catch (err) {
    console.error("Lead follow-up cron error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
