import { Pool } from "pg";

type CommunityAccess = { id: string; discord_user_id: string | null; active: boolean };
type CourseUser = { discordId: string | null; whopMembershipId?: string | null; subscriptionStatus: string | null };
let pool: Pool | undefined;

function communityPool() {
  if (!process.env.COMMUNITY_DATABASE_URL) return null;
  return pool ??= new Pool({
    connectionString: process.env.COMMUNITY_DATABASE_URL,
    max: 2, connectionTimeoutMillis: 5000, statement_timeout: 5000,
  });
}

export function hasAppSprintCheckout(...records: Array<Record<string, unknown> | null | undefined>) {
  return records.some((record) => {
    const metadata = record?.metadata as Record<string, unknown> | undefined;
    return typeof metadata?.community_checkout_id === "string"
      && typeof metadata.community_checkout_hash === "string"
      && typeof metadata.community_checkout_signature === "string";
  });
}

export async function isAppSprintManagedMembership(id: string | undefined) {
  const db = communityPool();
  if (!db || !id) return false;
  const result = await db.query("SELECT 1 FROM community_memberships WHERE id = $1", [id]);
  return result.rowCount !== 0;
}

export function isNewAppSprintCommunityMembership(membership: Record<string, unknown> | null) {
  const launch = Date.parse(process.env.COMMUNITY_LAUNCH_AT || "");
  const created = Date.parse(String(membership?.created_at ?? ""));
  const plans = (process.env.COMMUNITY_DIRECT_PLAN_IDS || "").split(",").map((id) => id.trim());
  const nestedPlan = membership?.plan as { id?: string } | undefined;
  const plan = membership?.plan_id ?? nestedPlan?.id;
  return Number.isFinite(launch) && Number.isFinite(created) && created >= launch
    && typeof plan === "string" && plans.includes(plan);
}

export function resolveCommunityCourseAccess(user: CourseUser, memberships: CommunityAccess[]) {
  const owned = memberships.find((row) => row.id === user.whopMembershipId);
  // A migrated membership's paid term replaces its historical stored status.
  if (owned) return owned.discord_user_id === user.discordId && owned.active;
  return memberships.some((row) => row.discord_user_id === user.discordId && row.active)
    || user.subscriptionStatus === "active";
}

export async function hasCommunityCourseAccess(user: CourseUser) {
  const db = communityPool();
  if (!db) return user.subscriptionStatus === "active";
  const result = await db.query<CommunityAccess>(`SELECT id, discord_user_id, paid_until > now() AS active
    FROM community_memberships WHERE discord_user_id = $1 OR id = $2`,
    [user.discordId, user.whopMembershipId ?? null]);
  return resolveCommunityCourseAccess(user, result.rows);
}
