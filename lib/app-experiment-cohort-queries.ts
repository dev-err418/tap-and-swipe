import "server-only";
import { experimentInstallUsersSql, EXPERIMENT_MINIMUM_INSTALL_VERSION } from "./app-experiment-cohort";

/** Match PostHog distinct IDs to the same install cohort used by Superwall reports. */
export async function loadExperimentInstallUserIds(appId: "glow" | "versy"): Promise<Set<string>> {
  const config = appId === "glow" ? { organization: 27020, application: 54736, key: process.env.SUPERWALL_GLOW_API_KEY }
    : { organization: 25476, application: 51393, key: process.env.SUPERWALL_VERSY_API_KEY };
  if (!config.key?.trim()) throw new Error("Install cohort reporting access is not configured.");
  const response = await fetch(`https://api.superwall.com/v2/organizations/${config.organization}/query`, {
    method: "POST", headers: { Authorization: `Bearer ${config.key.trim()}`, "Content-Type": "text/plain" },
    body: `${experimentInstallUsersSql(config.application, EXPERIMENT_MINIMUM_INSTALL_VERSION[appId])} LIMIT 30001 FORMAT JSON`,
    signal: AbortSignal.timeout(25_000), cache: "no-store",
  });
  if (!response.ok) throw new Error(`Install cohort query returned HTTP ${response.status}`);
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || !Array.isArray((result as { data?: unknown }).data)) throw new Error("Invalid install cohort response");
  const rows = (result as { data: { appUserId: unknown }[] }).data;
  if (rows.length > 30_000 || rows.some((row) => typeof row.appUserId !== "string" || !row.appUserId)) throw new Error("Install cohort reporting limit or invalid identity");
  return new Set(rows.map((row) => String(row.appUserId)));
}
