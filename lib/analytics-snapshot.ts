import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export type SnapshotMetadata = { snapshotUpdatedAt?: string };
type Snapshot<T> = { updatedAt: string; value: T };
const refreshContext = new AsyncLocalStorage<boolean>();
export const refreshAnalyticsSnapshots = <T>(load: () => Promise<T>) => refreshContext.run(true, load);

// Bump when report shapes or metric definitions change. These are disposable reports,
// never source events. Keep the directory outside public/ and mount it in Coolify.
const VERSION = "v35";
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

type SnapshotOptions<T> = {
  /** Explicitly compatible keys only; never reuse an arbitrary old report version. */
  fallbackKeys?: readonly string[];
  /** Keep the same projection for every caller of a key. Applied to disk reads and new reports. */
  project?: (value: T) => T;
};

export function createAnalyticsSnapshotCache() {
  const memory = new Map<string, { checkedAt: number; snapshot: Snapshot<object>; revision?: string; fallback?: boolean }>();
  const reads = new Map<string, Promise<Snapshot<object> | undefined>>();
  const pending = new Map<string, Promise<object>>();
  return async function snapshot<T extends object>(key: string, load: () => Promise<T>, options: SnapshotOptions<T> = {}): Promise<T & SnapshotMetadata> {
    const directory = analyticsSnapshotDirectory();
    const identity = (name: string) => `${directory}:${VERSION}:${name}`;
    const fileFor = (name: string) => directory ? path.join(directory, VERSION, `${createHash("sha256").update(name).digest("hex")}.json`) : null;
    const id = identity(key), file = fileFor(key);
    const force = refreshContext.getStore() === true;
    const project = (entry: Snapshot<T>): Snapshot<T> => options.project ? { ...entry, value: options.project(entry.value) } : entry;
    const stamp = (entry: Snapshot<T>): T & SnapshotMetadata => directory
      ? { ...entry.value, snapshotUpdatedAt: entry.updatedAt } : entry.value;
    const revisionOf = (info: Awaited<ReturnType<typeof stat>>) => `${info.ino}:${info.mtimeMs}:${info.size}`;

    async function readSaved(name: string): Promise<Snapshot<T> | undefined> {
      const readId = identity(name), entry = memory.get(readId), source = fileFor(name);
      if (entry && Date.now() - entry.checkedAt < (directory ? 10_000 : 90_000)) return entry.snapshot as Snapshot<T>;
      if (!source) return undefined;
      const running = reads.get(readId);
      if (running) return running as Promise<Snapshot<T> | undefined>;
      const work = (async () => {
        try {
          // Atomic replacements change the revision. Unchanged multi-megabyte reports
          // need only a stat, not another read, JSON parse and Date-reviver traversal.
          const revision = revisionOf(await stat(source));
          if (entry?.revision === revision) {
            entry.checkedAt = Date.now();
            return entry.snapshot as Snapshot<T>;
          }
          const raw = deserialize<T>(await readFile(source, "utf8"));
          const saved = name === key ? project(raw) : raw;
          memory.set(readId, { checkedAt: Date.now(), snapshot: saved, revision });
          return saved;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("analytics_snapshot_read_failed", { key: name });
          // A fallback must check its actual source again after the short memory cache.
          return entry?.fallback ? undefined : entry?.snapshot as Snapshot<T> | undefined;
        }
      })();
      reads.set(readId, work);
      try { return await work; } finally { reads.delete(readId); }
    }

    let saved = await readSaved(key);
    if (!saved && !force) {
      for (const fallback of options.fallbackKeys ?? []) {
        const candidate = await readSaved(fallback);
        if (candidate) {
          saved = project(candidate);
          memory.set(id, { checkedAt: Date.now(), snapshot: saved, fallback: true });
          break;
        }
      }
    }
    // Production serves the last compatible report while the scheduler refreshes.
    // Keep its original timestamp, including when using a compatible previous key.
    if (!force && saved && (!directory || process.env.NODE_ENV === "production"
      || Date.now() - Date.parse(saved.updatedAt) < 30 * 60_000)) return stamp(saved);
    const running = pending.get(id);
    if (running) return running as Promise<T & SnapshotMetadata>;
    const work = (async () => {
      try {
        const raw = await load();
        // Validate before projection so omitted UI fields cannot hide a source failure.
        if (!completeAnalyticsReport(raw)) {
          if (force) throw new Error(`Incomplete analytics report: ${key}`);
          return saved ? stamp(saved) : options.project ? options.project(raw) : raw;
        }
        const entry = project({ updatedAt: new Date().toISOString(), value: raw });
        let revision: string | undefined;
        if (file) {
          try {
            await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
            const temporary = `${file}.${randomUUID()}.tmp`;
            try {
              await writeFile(temporary, serialize(entry), { mode: 0o600 });
              await rename(temporary, file);
              revision = revisionOf(await stat(file));
            } finally { await rm(temporary, { force: true }); }
          } catch (error) {
            if (force) throw error;
            console.error("analytics_snapshot_write_failed", { key });
            if (saved) return stamp(saved);
            return entry.value;
          }
        }
        memory.set(id, { checkedAt: Date.now(), snapshot: entry, revision });
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
