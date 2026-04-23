import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_PRODUCTS = ["aso", "aso-solo", "aso-pro", "community", "starter", "bundle-aso", "bundle-community", "quiz", "coaching", "home"];
const VALID_TYPES = ["page_view", "cta_clicked", "stripe_shown", "paid", "trial_started", "quiz_start", "quiz_complete", "subscribe"];

export async function POST(request: NextRequest) {
  try {
    const { product, type, visitorId, sessionId, referrer, ref } = (await request.json()) as {
      product: string;
      type: string;
      visitorId: string;
      sessionId: string;
      referrer?: string;
      ref?: string;
    };

    if (!VALID_PRODUCTS.includes(product) || !VALID_TYPES.includes(type) || !visitorId || !sessionId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const country = request.headers.get("cf-ipcountry") || null;

    await prisma.pageEvent.upsert({
      where: { sessionId_type_product: { sessionId, type, product } },
      create: { product, type, visitorId, sessionId, country, referrer: referrer || null, ref: ref || null },
      update: {},
    }).catch(() => {});

    // Set visitor_id cookie if not already present
    const existingVid = request.cookies.get("visitor_id")?.value;
    const res = NextResponse.json({ ok: true });
    if (!existingVid) {
      res.cookies.set("visitor_id", visitorId, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
    }
    return res;
  } catch (err) {
    console.error("Event error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const product = request.nextUrl.searchParams.get("product") || "aso";
  const days = Number(request.nextUrl.searchParams.get("days") ?? "30");
  const type = request.nextUrl.searchParams.get("type") || "page_view";

  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.$queryRaw<
    { day: string; count: bigint }[]
  >`SELECT DATE("createdAt") as day, COUNT(*)::bigint as count
    FROM "PageEvent"
    WHERE product = ${product} AND type = ${type} AND "createdAt" >= ${since}
    GROUP BY day
    ORDER BY day`;

  return NextResponse.json(
    rows.map((r) => ({ day: r.day, count: Number(r.count) }))
  );
}
