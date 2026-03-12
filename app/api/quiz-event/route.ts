import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = ["page_view", "quiz_start", "quiz_complete", "booking_click"];

export async function POST(request: NextRequest) {
  try {
    const { type, sessionId, source } = (await request.json()) as {
      type: string;
      sessionId: string;
      source?: string;
    };

    if (!VALID_TYPES.includes(type) || !sessionId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Upsert to deduplicate — one event per session per type
    await prisma.quizEvent.upsert({
      where: { sessionId_type: { sessionId, type } },
      create: { type, sessionId, source: source || null },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Quiz event error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
