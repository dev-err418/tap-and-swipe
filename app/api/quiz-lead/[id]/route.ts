import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
