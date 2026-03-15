import { NextResponse } from "next/server";
import { asoPool as pool } from "@/lib/aso-db";
import { getSession } from "@/lib/session";
import crypto from "crypto";

async function isAdmin() {
  const session = await getSession();
  return session?.discordId === process.env.ADMIN_DISCORD_ID;
}

// GET /api/aso/licenses — List all license keys
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "0", 10);
  const search = url.searchParams.get("search")?.trim() || "";

  let query = "SELECT * FROM aso_licenses";
  const params: (string | number)[] = [];

  if (search) {
    params.push(`%${search}%`);
    query += ` WHERE key ILIKE $1 OR email ILIKE $1 OR stripe_customer_id ILIKE $1`;
  }

  query += " ORDER BY created_at DESC";

  if (limit > 0) {
    params.push(limit);
    query += ` LIMIT $${params.length}`;
  }

  const { rows } = await pool.query(query, params.length > 0 ? params : undefined);

  return NextResponse.json(rows);
}

// POST /api/aso/licenses — Generate a new license key
export async function POST(req: Request) {
  if (!(await isAdmin())) {
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

const EDITABLE_COLUMNS = new Set(["email", "stripe_customer_id", "active", "machine_id", "plan"]);

// PATCH /api/aso/licenses — Update license fields
export async function PATCH(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { key, reset_machine, ...updates } = body;

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

  const sets: string[] = [];
  const params: unknown[] = [];

  for (const [col, val] of Object.entries(updates)) {
    if (!EDITABLE_COLUMNS.has(col)) continue;
    params.push(val === "" ? null : val);
    sets.push(`${col} = $${params.length}`);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  params.push(key);
  await pool.query(
    `UPDATE aso_licenses SET ${sets.join(", ")} WHERE key = $${params.length}`,
    params
  );

  return NextResponse.json({ key, updated: Object.keys(updates).filter((k) => EDITABLE_COLUMNS.has(k)) });
}
