import type { OrganicMetric, RoasDay, RoasMetric } from "./versy-meta-roas";

export type Campaign = { id: string; label: string; country: string; platform: string };
export type Amounts = { spend: number | null; proceeds: number | null; organic?: number | null };
export type TrendPoint = Amounts & { date: string; roas: number | null; incomplete: boolean };
export type Report = {
  snapshotUpdatedAt?: string;
  days: RoasDay[];
  campaigns: (Campaign & { values: Record<string, RoasMetric> })[];
  organic: Record<string, Record<string, OrganicMetric>>[];
  delivery: Record<string, string[]>;
  trend: Record<string, TrendPoint[]>;
  tablesAvailable: boolean;
};
export const DAYS = 21;
export const sumKnown = (values: (number | null | undefined)[]) =>
  values.every((v): v is number => v != null && Number.isFinite(v)) ? values.reduce((a, b) => a + b, 0) : null;
export const multiple = ({ spend, proceeds }: Amounts) => spend != null && spend > 0 && proceeds != null ? proceeds / spend : null;
export const overlapsGap = (period: { from: string; to: string }, platform?: string) =>
  period.to >= (platform === "android" ? "2026-11-23" : "2026-11-21") && period.from <= "2026-11-24";

export function buildMatrix(report: Report, country: string, weekly: boolean) {
  const days = report.days.slice(-DAYS);
  const periods = weekly ? [days.slice(0, 7), days.slice(7, 14), days.slice(14)].filter(p => p.length) : days.map(d => [d]);
  const columns = periods.map((p, i) => ({ from: p[0].date, to: p.at(-1)!.date,
    pending: weekly ? i === periods.length - 1 : p[0].immature }));
  function sum(rows: Amounts[]): Amounts {
    return { spend: sumKnown(rows.map(r => r.spend)), proceeds: sumKnown(rows.map(r => r.proceeds)), organic: sumKnown(rows.map(r => r.organic === undefined ? 0 : r.organic)) };
  }
  const collapse = (rows: Amounts[]) => weekly ? periods.map((p, i) => sum(rows.slice(i * 7, i * 7 + p.length))) : rows;
  const byCountry = new Map<string, typeof report.campaigns>();
  for (const c of report.campaigns) {
    if (country !== "all" && country !== c.country) continue;
    const list = byCountry.get(c.country) ?? [];
    list.push(c);
    byCountry.set(c.country, list);
  }
  const order = ["US", "FR", "DE", "ES"];
  const rank = (c: string) => order.includes(c) ? order.indexOf(c) : order.length;
  const groups = [...byCountry].sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b)).map(([code, entries]) => {
    const campaigns = entries.map(c => {
      const delivered = new Set(report.delivery[c.id]);
      const daily = days.map(({ date }) => {
        const row = c.values[date];
        return { spend: row?.spend === 0 && delivered.has(date) ? null : row?.spend ?? null, proceeds: row?.proceeds ?? null };
      });
      return { ...c, active: days.some(({ date }) => delivered.has(date) || c.values[date]?.spend > 0), daily, values: collapse(daily) };
    });
    const sources = report.organic.map(p => p[code]).filter(Boolean);
    const daily = days.map(({ date }, i) => {
      const organic = sumKnown(sources.map(source => source[date]?.proceeds));
      const totals = sum(campaigns.map(c => c.daily[i]));
      return { ...totals, organic, proceeds: sumKnown([totals.proceeds, organic]) };
    });
    return { code, campaigns: campaigns.filter(c => c.active), daily, values: collapse(daily) };
  }).filter(g => g.campaigns.length > 0);
  return { columns, groups, total: collapse(days.map((_, i) => sum(groups.map(g => g.daily[i])))) };
}
