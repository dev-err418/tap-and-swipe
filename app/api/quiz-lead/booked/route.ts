import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotification } from "@/lib/discord-webhook";
import { generateLeadMessage } from "@/lib/quiz-lead-message";

export async function POST(request: NextRequest) {
  try {
    const { email, leadId } = (await request.json()) as {
      email?: string;
      leadId?: string;
    };

    // Find lead by ID first, then fall back to most recent lead with that email
    let lead = leadId
      ? await prisma.quizLead.findUnique({ where: { id: leadId } })
      : null;

    if (!lead && email) {
      lead = await prisma.quizLead.findFirst({
        where: { email: email.toLowerCase() },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (lead.status === "new") {
      await prisma.quizLead.update({
        where: { id: lead.id },
        data: { status: "booked" },
      });
    }

    const { temperature, message: leadMessage, whatsappUrl } = generateLeadMessage({
      firstName: lead.firstName,
      countryCode: lead.countryCode,
      phone: lead.phone,
      answers: lead.answers as Record<string, number>,
      booked: true,
    });

    await sendDiscordNotification(
      "\u{1F4C5} [App Sprint] Call booked",
      undefined,
      [
        { name: "Name", value: lead.firstName, inline: true },
        { name: "Email", value: lead.email, inline: true },
        {
          name: "Phone",
          value: `${lead.countryCode} ${lead.phone}`,
          inline: false,
        },
        { name: "Profile", value: lead.profileType, inline: true },
        { name: "Source", value: lead.source || "Direct", inline: true },
        { name: "Lead Score", value: temperature, inline: true },
        { name: "WhatsApp", value: `[Open in WhatsApp](${whatsappUrl})`, inline: true },
      ],
      0x5865f2,
    ).catch((err) => console.error("Discord booking notification failed:", err));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Booked notification error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
