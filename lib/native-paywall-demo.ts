import { PAYWALL_HORIZONS, type NativePaywallGroup, type NativePaywallReport, type NativePaywallRow } from "./native-paywall-analytics";

// UI-only synthetic data. Never send this to Superwall or merge it with live reports.
// A seeded generator keeps the preview stable across renders and hydration.
function randomGenerator() {
  let seed = 54736;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function createDemoReport(): NativePaywallReport {
  const random = randomGenerator();
  const row = (id: string, label: string, users: number, variant: number): NativePaywallRow => {
    const views = Math.round(users * (0.72 + random() * 0.13));
    const conversions = Math.round(views * (0.12 + variant * 0.025 + random() * 0.03));
    const paid = Math.round(conversions * 0.63);
    const grossRevenue = paid * (variant ? 39.99 : 29.99);
    const refunds = Math.round(paid * 0.035) * (variant ? 39.99 : 29.99);
    const proceeds = (grossRevenue - refunds) * 0.85;
    return {
      id, label, paywall: `native_timeline_${id}_v1`, users, views, conversions, paid, grossRevenue, refunds, proceeds,
      estimates: Object.fromEntries(PAYWALL_HORIZONS.map((days) => [days, {
        users: Math.round(users * ({ 7: 0.88, 14: 0.72, 30: 0.46 }[days])),
        appu: proceeds / users * ({ 7: 0.74, 14: 0.87, 30: 0.98 }[days]),
        chanceBest: variant ? 0.94 : 0.06,
        reason: null,
      }])) as NativePaywallRow["estimates"],
    };
  };
  const sum = (rows: NativePaywallRow[]): NativePaywallRow => {
    const total = { ...rows[0], estimates: { ...rows[0].estimates } };
    for (const key of ["users", "views", "conversions", "paid", "grossRevenue", "refunds", "proceeds"] as const) {
      total[key] = rows.reduce((n, r) => n + r[key], 0);
    }
    for (const days of PAYWALL_HORIZONS) {
      const users = rows.reduce((n, r) => n + r.estimates[days].users, 0);
      total.estimates[days] = {
        ...total.estimates[days], users,
        appu: rows.reduce((n, r) => n + (r.estimates[days].appu ?? 0) * r.estimates[days].users, 0) / users,
      };
    }
    return total;
  };
  const placements = [
    ["onboarding_iam_complete", "Onboarding · Current", 0.36],
    ["onboarding_complete_copy", "Onboarding · New copy", 0.41],
    ["themes_upgrade", "Theme upgrade", 0.11],
    ["settings_upgrade", "Settings upgrade", 0.045],
    ["home_crown", "Home crown", 0.035],
    ["journal_upgrade", "Journal upgrade", 0.04],
  ] as const;
  const groups: NativePaywallGroup[] = (["en", "es", "de"] as const).map((language, i) => {
    const size = [8400, 3200, 1800][i];
    const paywalls = [row("annual", "Annual", size, 0), row("pro_yearly", "Pro yearly", size + 37 - i * 19, 1)];
    const totals = sum(paywalls);
    // Partition outcomes so the synthetic placement revenue matches the paywall total.
    const allocated = { conversions: 0, paid: 0, proceeds: 0, grossRevenue: 0, refunds: 0 };
    return {
      experiment: "native_yearly_v1", name: "Native yearly offer", language, paywalls,
      placements: placements.map(([id, label, weight], index) => {
        const users = Math.round(totals.users * (weight + 0.045));
        const result: NativePaywallRow = { ...totals, id, label, paywall: "", users, views: Math.round(users * 0.94), estimates: { ...totals.estimates } };
        for (const key of ["conversions", "paid", "proceeds", "grossRevenue", "refunds"] as const) {
          result[key] = index === placements.length - 1 ? totals[key] - allocated[key] : Math.round(totals[key] * weight);
          allocated[key] += result[key];
        }
        for (const days of PAYWALL_HORIZONS) result.estimates[days] = {
          users: Math.round(users * ({ 7: 0.88, 14: 0.72, 30: 0.46 }[days])),
          appu: result.proceeds / users * ({ 7: 0.74, 14: 0.87, 30: 0.98 }[days]),
          chanceBest: null, reason: "Placements are not randomly assigned.",
        };
        return result;
      }),
    };
  });
  const all: NativePaywallGroup = {
    experiment: "native_yearly_v1", name: "Native yearly offer", language: "all",
    paywalls: groups[0].paywalls.map((_, i) => sum(groups.map((g) => g.paywalls[i]))),
    placements: groups[0].placements.map((_, i) => sum(groups.map((g) => g.placements[i]))),
  };
  return { status: "ready", asOf: Date.UTC(2026, 8, 19), groups: [all, ...groups], warnings: [] };
}

export const NATIVE_PAYWALL_DEMO_REPORT = createDemoReport();
