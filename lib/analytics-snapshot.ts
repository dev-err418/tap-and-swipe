import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export type SnapshotMetadata = { snapshotUpdatedAt?: string };
type Snapshot<T> = { updatedAt: string; value: T };
const refreshContext = new AsyncLocalStorage<boolean>();
export const refreshAnalyticsSnapshots = <T>(load: () => Promise<T>) => refreshContext.run(true, load);

// Bump when report shapes or metric definitions change. These are disposable reports,
// never source events. Keep the directory outside public/ and mount it in Coolify.
const VERSION = "v26";
export function analyticsSnapshotDirectory() {
  return process.env.ANALYTICS_SNAPSHOT_DIR?.trim()
    || (process.env.NODE_ENV === "production" ? null : path.join(process.cwd(), ".cache/analytics"));
}

/** A failed/limited subreport must not replace the last complete snapshot. */
export function completeAnalyticsReport(value: unknown): boolean {
  if (value === null || typeof value !== "object") return true;
  if (Array.isArray(value)) return value.every(completeAnalyticsReport);
  const record = value as Record<string, unknown>;
  // A valid experiment can lack enough observations to estimate statistical
  // readiness. That is different from a failed data fetch and is safe to cache.
  const statisticalReadiness = typeof record.observed === "number"
    && typeof record.minimumDetectableEffect === "number"
    && typeof record.confidenceLevel === "number" && typeof record.power === "number";
  if (["unavailable", "setup_required", "limited", "truncated"].includes(String(record.status))
    && !(record.status === "unavailable" && statisticalReadiness)) return false;
  if (record.truncated === true || record.cohortDataAvailable === false || record.sessionsAvailable === false) return false;
  return Object.values(record).every(completeAnalyticsReport);
}

function serialize(value: unknown) {
  return JSON.stringify(value, function (key, item) {
    return this[key] instanceof Date ? { $analyticsDate: this[key].toISOString() } : item;
  });
}
function deserialize<T>(text: string): Snapshot<T> {
  const result = JSON.parse(text, (_key, value) => value && typeof value === "object"
    && typeof value.$analyticsDate === "string" && Object.keys(value).length === 1
    ? new Date(value.$analyticsDate) : value) as Snapshot<T>;
  if (!result || !Number.isFinite(Date.parse(result.updatedAt)) || !result.value) throw new Error("Invalid analytics snapshot");
  return result;
}

export function createAnalyticsSnapshotCache() {
  const memory = new Map<string, { checkedAt: number; snapshot: Snapshot<object> }>();
  const pending = new Map<string, Promise<object>>();
  return async function snapshot<T extends object>(key: string, load: () => Promise<T>): Promise<T & SnapshotMetadata> {
    const directory = analyticsSnapshotDirectory();
    const id = `${directory}:${VERSION}:${key}`;
    const force = refreshContext.getStore() === true;
    const file = directory ? path.join(directory, VERSION, `${createHash("sha256").update(key).digest("hex")}.json`) : null;
    let saved = memory.get(id)?.snapshot as Snapshot<T> | undefined;
    const stamp = (entry: Snapshot<T>): T & SnapshotMetadata => directory
      ? { ...entry.value, snapshotUpdatedAt: entry.updatedAt } : entry.value;
    // Brief memory cache; re-read the shared volume to pick up another process's refresh.
    if (!force && saved && Date.now() - memory.get(id)!.checkedAt < (directory ? 10_000 : 90_000)) return stamp(saved);
    if (file) {
      try {
        saved = deserialize<T>(await readFile(file, "utf8"));
        memory.set(id, { checkedAt: Date.now(), snapshot: saved });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("analytics_snapshot_read_failed", { key });
      }
      // Deliberately serve stale data. The scheduler owns refreshes, so opening a
      // page never waits on an upstream API when a successful snapshot exists.
      if (!force && saved && (process.env.NODE_ENV === "production"
        || Date.now() - Date.parse(saved.updatedAt) < 30 * 60_000)) return stamp(saved);
    }
    const running = pending.get(id);
    if (running) return running as Promise<T & SnapshotMetadata>;
    const work = (async () => {
      try {
        const value = await load();
        if (!completeAnalyticsReport(value)) {
          if (force) throw new Error(`Incomplete analytics report: ${key}`);
          return saved ? stamp(saved) : value;
        }
        const entry = { updatedAt: new Date().toISOString(), value };
        if (file) {
          try {
            await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
            const temporary = `${file}.${randomUUID()}.tmp`;
            try {
              await writeFile(temporary, serialize(entry), { mode: 0o600 });
              await rename(temporary, file);
            } finally { await rm(temporary, { force: true }); }
          } catch (error) {
            if (force) throw error;
            console.error("analytics_snapshot_write_failed", { key });
            if (saved) return stamp(saved);
            // Storage failure must not turn otherwise usable live data into a 500.
            return value;
          }
        }
        memory.set(id, { checkedAt: Date.now(), snapshot: entry });
        return stamp(entry);
      } catch (error) {
        if (!force && saved) return stamp(saved);
        throw error;
      }
    })();
    pending.set(id, work);
    try { return await work; } finally { pending.delete(id); }
  };
}

export const analyticsSnapshot = createAnalyticsSnapshotCache();
