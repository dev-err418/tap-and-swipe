import { NextResponse } from "next/server";
import { asoPool as pool } from "@/lib/aso-db";
import crypto from "crypto";

// Dev-only guard
function isDev() {
  return process.env.NODE_ENV === "development";
}

// GET /api/aso/licenses — List all license keys
export async function GET() {
  if (!isDev()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { rows } = await pool.query(
    "SELECT * FROM aso_licenses ORDER BY created_at DESC"
  );

  return NextResponse.json(rows);
}

// POST /api/aso/licenses — Generate a new license key
export async function POST(req: Request) {
  if (!isDev()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const email = body.email || null;

  const segments = Array.from({ length: 4 }, () =>
    crypto.randomBytes(2).toString("hex").toUpperCase()
  );
  const key = `ASO-${segments.join("-")}`;

  await pool.query(
    "INSERT INTO aso_licenses (key, email) VALUES ($1, $2)",
    [key, email]
  );

  return NextResponse.json({ key, email });
}

// PATCH /api/aso/licenses — Toggle active status or reset machine binding
export async function PATCH(req: Request) {
  if (!isDev()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { key, active, reset_machine } = body;

  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  if (reset_machine) {
    await pool.query(
      "UPDATE aso_licenses SET machine_id = NULL WHERE key = $1",
      [key]
    );
    return NextResponse.json({ key, machine_id: null });
  }

  if (typeof active !== "boolean") {
    return NextResponse.json(
      { error: "active (boolean) or reset_machine required" },
      { status: 400 }
    );
  }

  await pool.query(
    "UPDATE aso_licenses SET active = $1 WHERE key = $2",
    [active, key]
  );

  return NextResponse.json({ key, active });
}
