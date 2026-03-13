import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotification } from "@/lib/discord-webhook";
import { generateLeadMessage } from "@/lib/quiz-lead-message";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, email, phone, countryCode, answers, source } =
      body as {
        firstName: string;
        email: string;
        phone: string;
        countryCode: string;
        profileType: string;
        answers: Record<string, number>;
        source?: string;
      };

    const profileType = "dev-indie";

    if (!firstName || typeof firstName !== "string") {
      return NextResponse.json({ error: "firstName is required" }, { status: 400 });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    const country = request.headers.get("cf-ipcountry") || null;
    const city = request.headers.get("cf-ipcity") || null;

    const lead = await prisma.quizLead.create({
      data: {
        firstName: firstName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        countryCode: countryCode || "+33",
        profileType,
        answers,
        source: source || null,
        country,
        city: city ? decodeURIComponent(city) : null,
      },
    });

    const { temperature, message: leadMessage, whatsappUrl } = generateLeadMessage({
      firstName: firstName.trim(),
      countryCode: countryCode || "+33",
      phone: phone.trim(),
      answers,
      booked: false,
    });

    await sendDiscordNotification(
      "🎯 [App Sprint] New lead",
      undefined,
      [
        { name: "Name", value: firstName.trim(), inline: true },
        { name: "Email", value: email.trim().toLowerCase(), inline: true },
        { name: "Phone", value: `${countryCode || "+33"} ${phone.trim()}`, inline: false },
        { name: "Profile", value: profileType, inline: true },
        { name: "Source", value: source || "Direct", inline: true },
        { name: "Location", value: [city ? decodeURIComponent(city) : null, country].filter(Boolean).join(", ") || "Unknown", inline: true },
        { name: "Lead Score", value: temperature, inline: true },
        { name: "WhatsApp", value: `[Open in WhatsApp](${whatsappUrl})`, inline: true },
      ]
    ).catch((err) => console.error("Discord notification failed:", err));

    return NextResponse.json({ success: true, id: lead.id });
  } catch (err) {
    console.error("Quiz lead error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
