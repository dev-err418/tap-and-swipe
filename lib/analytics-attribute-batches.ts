/** Split saturated attribute queries by key, retaining every user and failing closed on truncation. */
export async function loadCompleteAttributeRows<T>(
  keys: string[], load: (keys: string[]) => Promise<T[]>, limit: number,
): Promise<T[]> {
  const unique = [...new Set(keys)];
  if (!unique.length) return [];
  const rows = await load(unique);
  if (rows.length < limit) return rows;
  if (unique.length === 1) throw new Error("User attributes exceed the reporting limit for one key.");
  const middle = Math.ceil(unique.length / 2);
  const batches = await Promise.all([
    loadCompleteAttributeRows(unique.slice(0, middle), load, limit),
    loadCompleteAttributeRows(unique.slice(middle), load, limit),
  ]);
  return batches.flat();
}
