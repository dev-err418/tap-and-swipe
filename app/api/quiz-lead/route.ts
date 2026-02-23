import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, email, phone, countryCode, profileType, answers, source } =
      body as {
        firstName: string;
        email: string;
        phone: string;
        countryCode: string;
        profileType: string;
        answers: Record<string, number>;
        source?: string;
      };

    if (!firstName || typeof firstName !== "string") {
      return NextResponse.json({ error: "firstName is required" }, { status: 400 });
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "phone is required" }, { status: 400 });
    }

    if (profileType !== "dev-indie" && profileType !== "entreprise") {
      return NextResponse.json({ error: "Invalid profileType" }, { status: 400 });
    }

    const country = request.headers.get("x-vercel-ip-country") || null;
    const city = request.headers.get("x-vercel-ip-city") || null;

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

    return NextResponse.json({ success: true, id: lead.id });
  } catch (err) {
    console.error("Quiz lead error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
