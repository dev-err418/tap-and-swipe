import { NextRequest, NextResponse } from "next/server";
import { asoPool } from "@/lib/aso-db";
import { stripe } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const WHOP_MEMBERSHIPS_URL = "https://whop.com/@me/settings/memberships/";

type LicenseRow = {
  key: string;
  active: boolean;
  stripe_customer_id: string | null;
  whop_membership_id: string | null;
  whop_manage_url: string | null;
  provider: string | null;
};

function normalizeLicenseKey(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const licenseKey = normalizeLicenseKey(body.licenseKey);

    if (!licenseKey) {
      return NextResponse.json(
        { error: "Enter your AppSprint ASO license key." },
        { status: 400 }
      );
    }

    const { rows } = await asoPool.query<LicenseRow>(
      `SELECT key, active, stripe_customer_id, whop_membership_id, whop_manage_url, provider
       FROM aso_licenses
       WHERE UPPER(key) = UPPER($1)
       LIMIT 1`,
      [licenseKey]
    );

    const license = rows[0];
    if (!license || !license.active) {
      return NextResponse.json(
        { error: "No active subscription was found for that license key." },
        { status: 404 }
      );
    }

    if (
      license.provider === "whop" ||
      license.whop_membership_id ||
      license.whop_manage_url
    ) {
      return NextResponse.json({
        url: WHOP_MEMBERSHIPS_URL,
        provider: "whop",
      });
    }

    if (license.stripe_customer_id) {
      const session = await stripe.billingPortal.sessions.create({
        customer: license.stripe_customer_id,
        return_url: `${APP_URL}/aso/manage?status=returned`,
      });

      return NextResponse.json({
        url: session.url,
        provider: "stripe",
      });
    }

    return NextResponse.json(
      { error: "This license does not have a self-service billing link yet. Contact support@tap-and-swipe.com and include your license key." },
      { status: 409 }
    );
  } catch (err) {
    console.error("[ASO Manage] Error:", err);
    return NextResponse.json(
      { error: "Could not open subscription management." },
      { status: 500 }
    );
  }
}
