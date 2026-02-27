import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = [
  "new",
  "abandoned",
  "booked",
  "whatsapp_sent",
  "got_answered",
  "show",
  "no_show",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { status } = (await request.json()) as { status: string };

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    await prisma.quizLead.update({
      where: { id },
      data: {
        status,
        ...(status === "show"
          ? { showAt: new Date() }
          : { showAt: null }),
      },
    });
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("Update lead error:", err);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await prisma.quizLead.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete lead error:", err);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
