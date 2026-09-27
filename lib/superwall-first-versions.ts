type Query = <T>(sql: string) => Promise<T[]>;
const quote = (value: string) => `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;

/** First recorded device version for a known set of users, including users installed before the report window. */
export async function loadFirstInstalledVersions(query: Query, applicationId: number, userIds: string[]) {
  const versions = new Map<string, string>();
  for (let i = 0; i < userIds.length; i += 2000) {
    const batches = [0, 500, 1000, 1500].map((offset) => userIds.slice(i + offset, i + offset + 500)).filter((batch) => batch.length);
    const pages = await Promise.all(batches.map((batch) => query<{ appUserId: string; ver: string }>(`
SELECT appUserId, argMin(JSONExtractString(meta, 'appVersion'), ts) AS ver
FROM sw.demand_score_events_rep
WHERE applicationId = ${applicationId} AND isSandbox = 0 AND name = 'device_attributes' AND ts < now()
  AND appUserId IN (${batch.map(quote).join(",")})
GROUP BY appUserId
FORMAT JSON`)));
    for (const rows of pages) for (const row of rows) versions.set(row.appUserId, row.ver);
  }
  return versions;
}
