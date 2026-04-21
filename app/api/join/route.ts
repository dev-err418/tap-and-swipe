import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_HAS_APP = ["revenue", "no-revenue", "idea", "scratch"];
const VALID_BUDGETS = ["under-500", "500-2000", "2000-3000", "4000-5000", "5000-plus"];
const VALID_ROUTES = ["coaching", "community"];

export async function POST(request: NextRequest) {
  try {
    const { firstName, email, hasApp, challenge, budget, route, ref } =
      (await request.json()) as {
        firstName: string;
        email: string;
        hasApp: string;
        challenge?: string;
        budget: string;
        route: string;
        ref?: string;
      };

    if (
      !firstName?.trim() ||
      !email?.trim() ||
      !VALID_HAS_APP.includes(hasApp) ||
      !VALID_BUDGETS.includes(budget) ||
      !VALID_ROUTES.includes(route)
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const country = request.headers.get("cf-ipcountry") || null;

    await prisma.quizLead.create({
      data: {
        firstName: firstName.trim(),
        email: email.trim().toLowerCase(),
        hasApp,
        challenge: challenge?.trim() || null,
        budget,
        route,
        ref: ref || null,
        country,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Quiz lead error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
