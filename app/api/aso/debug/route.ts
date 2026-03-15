import { NextRequest, NextResponse } from "next/server";
import { asoPool, generateAsoLicense, deactivateAsoLicenses, reactivateAsoLicenses } from "@/lib/aso-db";

// Temporary debug route — DELETE AFTER TESTING
// Protected by CRON_SECRET

function authorized(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  return secret === process.env.CRON_SECRET;
}

// GET /api/aso/debug?secret=xxx — List recent licenses
// GET /api/aso/debug?secret=xxx&action=create&email=test@test.com&plan=solo — Create test license
// GET /api/aso/debug?secret=xxx&action=deactivate&customer=cus_xxx — Deactivate licenses
// GET /api/aso/debug?secret=xxx&action=reactivate&customer=cus_xxx — Reactivate licenses
// GET /api/aso/debug?secret=xxx&action=update-plan&customer=cus_xxx&plan=pro — Update plan
// GET /api/aso/debug?secret=xxx&action=delete-test — Delete all test licenses
export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = req.nextUrl.searchParams.get("action");

  if (!action) {
    const { rows } = await asoPool.query(
      "SELECT key, email, plan, active, stripe_customer_id, machine_id, created_at FROM aso_licenses ORDER BY created_at DESC LIMIT 20"
    );
    return NextResponse.json({ licenses: rows });
  }

  if (action === "create") {
    const email = req.nextUrl.searchParams.get("email") || "debug@test.com";
    const plan = (req.nextUrl.searchParams.get("plan") || "pro") as "solo" | "pro";
    const key = await generateAsoLicense(email, `debug_${Date.now()}`, plan);
    return NextResponse.json({ key, email, plan });
  }

  if (action === "deactivate") {
    const customer = req.nextUrl.searchParams.get("customer");
    if (!customer) return NextResponse.json({ error: "customer required" }, { status: 400 });
    await deactivateAsoLicenses(customer);
    return NextResponse.json({ deactivated: customer });
  }

  if (action === "reactivate") {
    const customer = req.nextUrl.searchParams.get("customer");
    if (!customer) return NextResponse.json({ error: "customer required" }, { status: 400 });
    await reactivateAsoLicenses(customer);
    return NextResponse.json({ reactivated: customer });
  }

  if (action === "update-plan") {
    const customer = req.nextUrl.searchParams.get("customer");
    const plan = req.nextUrl.searchParams.get("plan");
    if (!customer || !plan) return NextResponse.json({ error: "customer and plan required" }, { status: 400 });
    await asoPool.query(
      "UPDATE aso_licenses SET plan = $1 WHERE stripe_customer_id = $2 AND active = true",
      [plan, customer]
    );
    return NextResponse.json({ updated: customer, plan });
  }

  if (action === "delete-test") {
    const { rowCount } = await asoPool.query(
      "DELETE FROM aso_licenses WHERE stripe_customer_id LIKE 'debug_%'"
    );
    return NextResponse.json({ deleted: rowCount });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
