import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotification } from "@/lib/discord-webhook";
import { generateLeadMessage } from "@/lib/quiz-lead-message";

function getBusinessTypeLabel(q1?: number): string {
  switch (q1) {
    case 0:
      return "Founder / small B2C team";
    case 1:
      return "Developer / freelancer / agency";
    case 2:
      return "Exploring / curious";
    default:
      return "Unknown";
  }
}

function getRevenueBracketLabel(q2?: number): string {
  switch (q2) {
    case 0:
      return "€3k-€50k MRR";
    case 1:
      return "Under €3k MRR";
    case 2:
      return "Not live yet";
    case 3:
      return "Idea stage";
    default:
      return "Unknown";
  }
}

function getIntentLabel(q3?: number): string {
  return q3 === 1 ? "Build / improve the app" : "Scale the app";
}

function getScaleBlockerLabel(q4?: number): string {
  switch (q4) {
    case 0:
      return "Channel revenue visibility is too weak";
    case 1:
      return "Paid acquisition feels blind";
    case 2:
      return "Attribution / SKAN is unreliable";
    case 3:
      return "Needs the full growth system";
    default:
      return "N/A";
  }
}

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

    const { temperature, whatsappUrl } = generateLeadMessage({
      firstName: lead.firstName,
      countryCode: lead.countryCode,
      phone: lead.phone,
      answers: lead.answers as Record<string, number>,
      booked: true,
    });

    const fields = [
      { name: "Name", value: lead.firstName, inline: true },
      { name: "Email", value: lead.email, inline: true },
      { name: "Profile", value: lead.profileType, inline: true },
      {
        name: "Business type",
        value: getBusinessTypeLabel((lead.answers as Record<string, number>)?.q1),
        inline: true,
      },
      {
        name: "Revenue",
        value: getRevenueBracketLabel((lead.answers as Record<string, number>)?.q2),
        inline: true,
      },
      {
        name: "Intent",
        value: getIntentLabel((lead.answers as Record<string, number>)?.q3),
        inline: true,
      },
      {
        name: "Scale blocker",
        value: getScaleBlockerLabel((lead.answers as Record<string, number>)?.q4),
        inline: true,
      },
      { name: "Source", value: lead.source || "Direct", inline: true },
      { name: "Lead Score", value: temperature, inline: true },
    ];

    if (lead.phone) {
      fields.splice(2, 0, {
        name: "Phone",
        value: `${lead.countryCode} ${lead.phone}`,
        inline: false,
      });
    }

    if (whatsappUrl) {
      fields.push({ name: "WhatsApp", value: `[Open in WhatsApp](${whatsappUrl})`, inline: true });
    }

    await sendDiscordNotification(
      lead.profileType === "scale"
        ? "\u{1F4C5} [AppSprint] Scale call booked"
        : "\u{1F4C5} [AppSprint] Build call booked",
      undefined,
      fields,
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
