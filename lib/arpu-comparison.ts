import type { VersionConversionMetric } from "./version-cohort-conversions";
import { calculateExperimentReadiness, EXPERIMENT_CONFIDENCE_Z, type ExperimentReadiness } from "./experiment-stats";

export const APPU_CONFIDENCE_LEVEL = 0.85;
export const APPU_CONFIDENCE_Z = EXPERIMENT_CONFIDENCE_Z[APPU_CONFIDENCE_LEVEL];

type AppuRow = { key: string; metric?: VersionConversionMetric };

/** Plan from observed APPU variance, with the same winner probability as the table.
 * Empty planned arms still need participants; missing money never becomes zero. */
export function appuComparisonReadiness(rows: AppuRow[]): ExperimentReadiness {
  const active = rows.filter((row) => row.metric && row.metric.installs > 0);
  const observed = active.reduce((sum, row) => sum + row.metric!.installs, 0);
  const reason = rows.some(({ metric }) => !metric || metric.missingProceeds || !Number.isFinite(metric.proceeds))
    ? "Complete proceeds data is needed for every variant."
    : active.some(({ metric }) => metric!.proceedsVariance == null || !Number.isFinite(metric!.proceedsVariance) || metric!.proceedsVariance! <= 0)
      ? "More proceeds variation is needed to estimate the APPU sample target."
      : null;
  if (reason) return { ...calculateExperimentReadiness([], "revenue_per_visitor", { confidenceLevel: APPU_CONFIDENCE_LEVEL }), observed, reason };
  const baseline = active[0];
  const ordered = baseline ? [baseline, ...rows.filter((row) => row !== baseline)] : rows;
  const comparisons = compareArpu(rows);
  return calculateExperimentReadiness(ordered.map(({ key, metric }) => ({
    key, label: key, exposures: metric!.installs, conversions: metric!.installPaid,
    revenue: metric!.proceeds, variance: metric!.proceedsVariance ?? 0,
  })), "revenue_per_visitor", {
    confidenceLevel: APPU_CONFIDENCE_LEVEL,
    decisiveProbability: Math.max(0, ...comparisons.map((row) => row.winProbability ?? 0)),
  });
}

export type ArpuComparison = {
  key: string;
  baseline: string | null;
  isBaseline: boolean;
  lift: number | null;
  interval: [number, number] | null;
  winProbability: number | null;
  reason: string | null;
};

/** Normal approximation to mean net proceeds per install, using observed user-level
 * sample variance. These are descriptive estimates, not causal experiment results.
 * No synthetic variance, conversion-rate proxy, or revenue-share probabilities. */
export function compareArpu(rows: AppuRow[]): ArpuComparison[] {
  const active = rows.filter((row) => row.metric && row.metric.installs > 0);
  const baseline = active[0];
  const results: ArpuComparison[] = rows.map(({ key, metric }) => ({
    key, baseline: baseline?.key ?? null, isBaseline: key === baseline?.key,
    lift: metric && metric.installs > 0 && Number.isFinite(metric.proceeds) && baseline?.metric && !metric.missingProceeds && !baseline.metric.missingProceeds && baseline.metric.proceeds > 0
      ? (metric.proceeds / metric.installs) / (baseline.metric.proceeds / baseline.metric.installs) - 1 : null,
    interval: null, winProbability: null, reason: null,
  }));
  let reason: string | null = null;
  if (rows.some((row) => !row.metric || row.metric.missingProceeds || !Number.isFinite(row.metric.proceeds))) {
    reason = "Complete revenue data is needed for every row.";
  } else if (active.length < 2) {
    reason = "At least two populated rows are needed to compare APPU.";
  } else if (active.some(({ metric }) => metric!.installs < 20)) {
    reason = "Win estimates need at least 20 installs in each populated row.";
  } else if (active.some(({ metric }) => metric!.proceedsVariance == null || !Number.isFinite(metric!.proceedsVariance) || metric!.proceedsVariance! <= 0)) {
    reason = "More revenue variation is needed in each populated row to estimate uncertainty.";
  }
  if (reason) return results.map((result) => ({ ...result, reason }));

  // Sort by stable identity so reordering rows never changes Win %.
  const arms = active.map(({ key, metric }) => ({
    key, mean: metric!.proceeds / metric!.installs,
    variance: metric!.proceedsVariance! / metric!.installs,
  })).sort((a, b) => a.key.localeCompare(b.key));
  let seed = 1729;
  const uniform = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return (seed + 0.5) / 4294967296; };
  const normal = () => Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
  const wins = new Map(arms.map((arm) => [arm.key, 0]));
  const samples = 20_000;
  for (let draw = 0; draw < samples; draw++) {
    let best = -Infinity;
    let winners: string[] = [];
    for (const arm of arms) {
      const value = arm.mean + Math.sqrt(arm.variance) * normal();
      if (value > best) { best = value; winners = [arm.key]; }
      else if (value === best) winners.push(arm.key);
    }
    for (const key of winners) wins.set(key, wins.get(key)! + 1 / winners.length);
  }
  const reference = arms.find((arm) => arm.key === baseline!.key)!;
  return results.map((result) => {
    const arm = arms.find((candidate) => candidate.key === result.key);
    if (!arm) return { ...result, reason: "No installs in this row." };
    // Relative lift is unstable when the baseline's interval reaches zero.
    const reliableDenominator = reference.mean - APPU_CONFIDENCE_Z * Math.sqrt(reference.variance) > 0;
    const se = reliableDenominator ? Math.sqrt(arm.variance / reference.mean ** 2
      + arm.mean ** 2 * reference.variance / reference.mean ** 4) : null;
    return {
      ...result, winProbability: wins.get(arm.key)! / samples,
      interval: !result.isBaseline && result.lift != null && se != null
        ? [result.lift - APPU_CONFIDENCE_Z * se, result.lift + APPU_CONFIDENCE_Z * se] as [number, number] : null,
      reason: !result.isBaseline && !reliableDenominator
        ? "The baseline APPU is too close to zero to estimate a reliable relative-lift interval." : null,
    };
  });
}
