import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDiscordNotification } from "@/lib/discord-webhook";
import { generateLeadMessage } from "@/lib/quiz-lead-message";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getProfileType(answers: Record<string, number>): "scale" | "build" | "disqualified" {
  const q1 = answers?.q1;
  const q2 = answers?.q2;
  const q3 = answers?.q3;

  if (q1 !== 0) return "disqualified";
  if (q2 === 0) return "scale";
  if (q2 === 2) return "build";
  if (q3 === 1) return "build";
  if (q3 === 0) return "scale";
  return "disqualified";
}

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
    const body = await request.json();
    const { firstName, email, phone, countryCode, answers, source } =
      body as {
        firstName: string;
        email: string;
        phone?: string;
        countryCode?: string;
        answers: Record<string, number>;
        source?: string;
      };

    const profileType = getProfileType(answers ?? {});

    if (!firstName || typeof firstName !== "string") {
      return NextResponse.json({ error: "firstName is required" }, { status: 400 });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const country = request.headers.get("cf-ipcountry") || null;
    const city = request.headers.get("cf-ipcity") || null;
    const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
    const normalizedCountryCode = countryCode || "+33";

    const createdLead = await prisma.quizLead.create({
      data: {
        firstName: firstName.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizedPhone,
        countryCode: normalizedCountryCode,
        profileType,
        answers,
        source: source || null,
        country,
        city: city ? decodeURIComponent(city) : null,
      },
    });

    const { temperature, whatsappUrl } = generateLeadMessage({
      firstName: firstName.trim(),
      countryCode: normalizedCountryCode,
      phone: normalizedPhone,
      answers,
      booked: false,
    });

    const fields = [
      { name: "Name", value: firstName.trim(), inline: true },
      { name: "Email", value: email.trim().toLowerCase(), inline: true },
      { name: "Profile", value: profileType, inline: true },
      { name: "Business type", value: getBusinessTypeLabel(answers?.q1), inline: true },
      { name: "Revenue", value: getRevenueBracketLabel(answers?.q2), inline: true },
      { name: "Intent", value: getIntentLabel(answers?.q3), inline: true },
      { name: "Scale blocker", value: getScaleBlockerLabel(answers?.q4), inline: true },
      { name: "Source", value: source || "Direct", inline: true },
      { name: "Location", value: [city ? decodeURIComponent(city) : null, country].filter(Boolean).join(", ") || "Unknown", inline: true },
      { name: "Lead Score", value: temperature, inline: true },
    ];
    if (normalizedPhone) {
      fields.splice(2, 0, {
        name: "Phone",
        value: `${normalizedCountryCode} ${normalizedPhone}`,
        inline: false,
      });
    }
    if (whatsappUrl) {
      fields.push({ name: "WhatsApp", value: `[Open in WhatsApp](${whatsappUrl})`, inline: true });
    }

    await sendDiscordNotification(
      profileType === "scale"
        ? "🎯 [AppSprint] New scale lead"
        : "🎯 [AppSprint] New build lead",
      undefined,
      fields
    ).catch((err) => console.error("Discord notification failed:", err));

    return NextResponse.json({ success: true, id: createdLead.id });
  } catch (err) {
    console.error("Quiz lead error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
