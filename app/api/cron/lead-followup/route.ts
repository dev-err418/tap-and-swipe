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

    if (leads.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    const fields = leads.flatMap((lead) => {
      const { whatsappUrlFr, whatsappUrlEn } = generateFollowUpMessage({
        firstName: lead.firstName,
        countryCode: lead.countryCode,
        phone: lead.phone,
      });

      const answers = (lead.answers ?? {}) as Record<string, number>;
      const temperature = scoreTemperature(answers);

      return [
        {
          name: `${lead.firstName} (${temperature})`,
          value: `${lead.countryCode} ${lead.phone}\n[WhatsApp FR](${whatsappUrlFr}) | [WhatsApp EN](${whatsappUrlEn})`,
          inline: false,
        },
      ];
    });

    await sendDiscordNotification(
      "🔔 [App Sprint] Daily Follow-Ups",
      `${leads.length} lead${leads.length > 1 ? "s" : ""} to follow up with today:`,
      fields,
      0xffa500,
    );

    await prisma.quizLead.updateMany({
      where: { id: { in: leads.map((l) => l.id) } },
      data: { followUpSentAt: new Date() },
    });

    return NextResponse.json({ success: true, count: leads.length });
  } catch (err) {
    console.error("Lead follow-up cron error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
