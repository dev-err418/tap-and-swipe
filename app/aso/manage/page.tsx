import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const WHOP_MEMBERSHIPS_URL = "https://whop.com/@me/settings/memberships/";

export default function AsoManagePage() {
  redirect(WHOP_MEMBERSHIPS_URL);
}
