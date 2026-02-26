import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  if (session.discordId !== process.env.ADMIN_DISCORD_ID) return null;
  return session;
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const tier = body.tier === "full" ? "full" : "boilerplate";

  const token = randomUUID();
  const invite = await prisma.inviteLink.create({
    data: { token, tier },
  });

  const url = `https://tap-and-swipe.com/invite/${token}`;

  return NextResponse.json({ id: invite.id, token, url, tier });
}

export async function DELETE(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json().catch(() => ({ id: null }));
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await prisma.inviteLink.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invites = await prisma.inviteLink.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    invites: invites.map((inv) => ({
      id: inv.id,
      token: inv.token,
      tier: inv.tier,
      url: `https://tap-and-swipe.com/invite/${inv.token}`,
      used: !!inv.usedAt,
      usedAt: inv.usedAt?.toISOString() ?? null,
      discordId: inv.discordId,
      createdAt: inv.createdAt.toISOString(),
    })),
  });
}
