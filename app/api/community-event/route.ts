import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = ["page_view", "cta_clicked", "stripe_shown", "paid"];

export async function POST(request: NextRequest) {
  try {
    const { type, sessionId } = (await request.json()) as {
      type: string;
      sessionId: string;
    };

    if (!VALID_TYPES.includes(type) || !sessionId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await prisma.communityEvent.upsert({
      where: { sessionId_type: { sessionId, type } },
      create: { type, sessionId },
      update: {},
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Community event error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
