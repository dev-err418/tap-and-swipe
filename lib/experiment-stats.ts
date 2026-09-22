const MIN_SAMPLES = 50;
const MIN_CONVERSIONS = 5;
const DEBUG_RELAX_GATES = true;
const CONFIDENCE_LEVEL = 0.95;
const DEFAULT_POWER = 0.8;
const CONVERSION_MDE = 0.3;
const VALUE_MDE = 0.3;
const SIMULATION_RUNS = 20_000;
const Z_95_TWO_SIDED = 1.959963984540054;
const Z_80_POWER = 0.8416212335729143;

export type ExperimentArm = {
  key: string;
  label: string;
  exposures: number;
  conversions: number;
  revenue: number;
  /** Per-user sample variance when the source has it. */
  variance?: number;
};

export type ExperimentMetricKind = "revenue_per_visitor" | "conversion_rate";

export type VariantExperimentResult = {
  key: string;
  label: string;
  isControl: boolean;
  metricValue: number;
  chanceToWin: number | null;
  chanceToBeatControl: number | null;
  relativeDelta: number | null;
  credibleInterval: [number, number] | null;
  isSignificant: boolean;
  status: "control" | "winning" | "losing" | "inconclusive" | "insufficient_data";
};

export type ExperimentSampleNeed = {
  exposures: number;
  conversions: number;
  exposureNoun: string;
  conversionNoun: string;
};

export type ExperimentAnalysis = {
  metric: ExperimentMetricKind;
  metricLabel: string;
  sufficientData: boolean;
  reason: string | null;
  needed: ExperimentSampleNeed | null;
  readiness: ExperimentReadiness;
  variants: VariantExperimentResult[];
};

export type ExperimentReadinessStatus = "collecting" | "decisive" | "inconclusive" | "unavailable";

export type ExperimentReadiness = {
  status: ExperimentReadinessStatus;
  observed: number;
  required: number | null;
  remaining: number | null;
  progress: number | null;
  minimumDetectableEffect: number;
  confidenceLevel: number;
  power: number;
  estimatedDaysRemaining: number | null;
  estimatedCompletionAt: string | null;
  reason: string | null;
};

export type ExperimentReadinessOptions = {
  minimumDetectableEffect?: number;
  minimumSamplesPerVariant?: number;
  minimumConversionsPerVariant?: number;
  elapsedDays?: number;
  asOfMs?: number;
  decisiveProbability?: number | null;
};

export function analyzeExperiment(
  arms: ExperimentArm[],
  metric: ExperimentMetricKind,
  metricLabel: string,
  readinessOptions: ExperimentReadinessOptions = {},
): ExperimentAnalysis {
  const needed = sampleNeed(arms, metric, metricLabel);
  const needReason = formatSampleNeed(needed);
  if (arms.length === 0) {
    return {
      metric,
      metricLabel,
      sufficientData: false,
      reason: needReason ?? "Not enough data yet.",
      needed,
      readiness: calculateExperimentReadiness(arms, metric, readinessOptions),
      variants: [],
    };
  }

  const stats = arms.map((arm) => summarizeArm(arm, metric));
  const control = stats[0];
  const usable = stats.filter((arm) => arm.ok);
  const warning =
    stats.find((arm) => arm.warning)?.warning ??
    (usable.length < 2 || (control && control.ok && control.mean === 0) ? needReason : null);
  const chanceToWin = usable.length > 0 ? probabilityBest(usable) : {};

  const variants = stats.map((arm) => {
    const isControl = arm.key === control?.key;
    if (!arm.ok || !control?.ok) {
      return variantResult(arm, isControl, chanceToWin[arm.key] ?? null, null, null, null);
    }
    if (isControl) {
      return variantResult(arm, true, chanceToWin[arm.key] ?? null, null, null, controlInterval(arm));
    }

    const diff = arm.mean - control.mean;
    const se = Math.sqrt(arm.se * arm.se + control.se * control.se);
    const chanceToBeatControl = se > 0 ? 1 - normalCdf(0, diff, se) : diff > 0 ? 1 : 0;
    const lift = liftVsControl(arm, control, se);
    return variantResult(
      arm,
      false,
      chanceToWin[arm.key] ?? null,
      chanceToBeatControl,
      lift.relativeDelta,
      lift.interval,
    );
  });

  const sufficientData = stats.every((arm) => !arm.warning) && control.mean !== 0;
  const bestProbability = Math.max(0, ...variants.flatMap((variant) => variant.chanceToWin == null ? [] : [variant.chanceToWin]));
  return {
    metric,
    metricLabel,
    sufficientData,
    reason: sufficientData ? null : needReason ?? warning,
    needed: sufficientData ? null : needed,
    readiness: calculateExperimentReadiness(arms, metric, {
      ...readinessOptions,
      decisiveProbability: readinessOptions.decisiveProbability ?? bestProbability,
    }),
    variants,
  };
}

type ArmStats = {
  key: string;
  label: string;
  mean: number;
  se: number;
  variance: number;
  n: number;
  conversions: number;
  ok: boolean;
  warning: string | null;
};

function summarizeArm(arm: ExperimentArm, metric: ExperimentMetricKind): ArmStats {
  const n = arm.exposures;
  if (n <= 0) {
    return { key: arm.key, label: arm.label, mean: 0, se: 0, variance: 0, n: 0, conversions: 0, ok: false, warning: "Not enough data yet." };
  }

  if (metric === "conversion_rate") {
    const conversions = Math.max(0, arm.conversions);
    const p = conversions / n;
    const warning =
      n < MIN_SAMPLES || conversions < MIN_CONVERSIONS || n * (1 - p) < MIN_CONVERSIONS
        ? "Not enough data yet."
        : null;
    const variance = p * (1 - p);
    const se = Math.sqrt(variance / n) || fallbackSe(p, n);
    return { key: arm.key, label: arm.label, mean: p, se, variance, n, conversions, ok: true, warning };
  }

  const mean = arm.revenue / n;
  const conversions = DEBUG_RELAX_GATES
    ? Math.max(arm.conversions, Math.min(MIN_CONVERSIONS, n))
    : Math.max(0, arm.conversions);
  const warning =
    n < MIN_SAMPLES || arm.conversions < MIN_CONVERSIONS ? "Not enough data yet." : null;
  const p = Math.min(1, conversions / n);
  const aov = conversions > 0 ? arm.revenue / Math.max(arm.conversions, 1) : mean;
  const variance = arm.variance != null && Number.isFinite(arm.variance) && arm.variance >= 0
    ? arm.variance
    : p * (1 - p) * aov * aov;
  const se = Math.sqrt(variance / n) || fallbackSe(mean, n);
  return { key: arm.key, label: arm.label, mean, se, variance, n, conversions: arm.conversions, ok: true, warning };
}

/** Fixed-horizon planning target. This is deliberately independent from the live winner probability. */
export function calculateExperimentReadiness(
  arms: ExperimentArm[],
  metric: ExperimentMetricKind,
  options: ExperimentReadinessOptions = {},
): ExperimentReadiness {
  const minimumDetectableEffect = options.minimumDetectableEffect
    ?? (metric === "conversion_rate" ? CONVERSION_MDE : VALUE_MDE);
  const minimumSamplesPerVariant = options.minimumSamplesPerVariant ?? MIN_SAMPLES;
  const minimumConversionsPerVariant = options.minimumConversionsPerVariant ?? MIN_CONVERSIONS;
  const base = {
    observed: arms.reduce((sum, arm) => sum + Math.max(0, arm.exposures), 0),
    minimumDetectableEffect,
    confidenceLevel: CONFIDENCE_LEVEL,
    power: DEFAULT_POWER,
  };
  if (arms.length < 2) return unavailableReadiness(base, "Waiting for at least two variants.");

  const stats = arms.map((arm) => summarizeArm(arm, metric));
  const control = stats[0];
  if (!control.ok || control.mean <= 0) {
    return unavailableReadiness(base, "Waiting for a non-zero control baseline.");
  }

  const requiredPerVariant = requiredSamplesPerVariant(
    stats,
    metric,
    minimumDetectableEffect,
    minimumSamplesPerVariant,
    minimumConversionsPerVariant,
  );
  if (requiredPerVariant == null || !Number.isFinite(requiredPerVariant)) {
    return unavailableReadiness(base, "A stable sample target cannot be estimated yet.");
  }

  const required = requiredPerVariant * arms.length;
  const remainingByArm = arms.map((arm) => Math.max(0, requiredPerVariant - Math.max(0, arm.exposures)));
  const remaining = remainingByArm.reduce((sum, value) => sum + value, 0);
  const progress = required > 0 ? base.observed / required : 0;
  const elapsedDays = options.elapsedDays && options.elapsedDays > 0 ? options.elapsedDays : null;
  const estimatedDaysRemaining = elapsedDays == null || remaining === 0 ? (remaining === 0 ? 0 : null) : estimateRemainingDays(arms, remainingByArm, elapsedDays);
  const estimatedCompletionAt = estimatedDaysRemaining != null && options.asOfMs != null
    ? new Date(options.asOfMs + estimatedDaysRemaining * 86_400_000).toISOString()
    : null;
  const decisive = (options.decisiveProbability ?? 0) >= CONFIDENCE_LEVEL;
  const status: ExperimentReadinessStatus = remaining > 0
    ? "collecting"
    : decisive
      ? "decisive"
      : "inconclusive";

  return {
    ...base,
    status,
    required,
    remaining,
    progress,
    estimatedDaysRemaining,
    estimatedCompletionAt,
    reason: null,
  };
}

function unavailableReadiness(
  base: Pick<ExperimentReadiness, "observed" | "minimumDetectableEffect" | "confidenceLevel" | "power">,
  reason: string,
): ExperimentReadiness {
  return { ...base, status: "unavailable", required: null, remaining: null, progress: null,
    estimatedDaysRemaining: null, estimatedCompletionAt: null, reason };
}

function requiredSamplesPerVariant(
  stats: ArmStats[],
  metric: ExperimentMetricKind,
  mde: number,
  minimumSamples: number,
  minimumConversions: number,
) {
  const control = stats[0];
  const z = Z_95_TWO_SIDED + Z_80_POWER;
  if (metric === "conversion_rate") {
    const p1 = control.mean;
    const p2 = Math.min(0.999999, p1 * (1 + mde));
    const difference = p2 - p1;
    if (difference <= 0) return null;
    const midpoint = (p1 + p2) / 2;
    const numerator = Z_95_TWO_SIDED * Math.sqrt(2 * midpoint * (1 - midpoint))
      + Z_80_POWER * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
    return Math.max(minimumSamples, Math.ceil((numerator / difference) ** 2), Math.ceil(minimumConversions / p1), Math.ceil(minimumConversions / (1 - p1)));
  }

  const difference = Math.abs(control.mean) * mde;
  const usableVariances = stats.filter((stat) => stat.ok && stat.variance > 0).map((stat) => stat.variance);
  if (difference <= 0 || usableVariances.length === 0) return null;
  const pooledVariance = usableVariances.reduce((sum, value) => sum + value, 0) / usableVariances.length;
  const conversionRate = control.n > 0 ? control.conversions / control.n : 0;
  return Math.max(
    minimumSamples,
    Math.ceil((2 * z * z * pooledVariance) / (difference * difference)),
    conversionRate > 0 ? Math.ceil(minimumConversions / conversionRate) : minimumSamples,
  );
}

function estimateRemainingDays(arms: ExperimentArm[], remaining: number[], elapsedDays: number) {
  let days = 0;
  for (let index = 0; index < arms.length; index += 1) {
    if (remaining[index] <= 0) continue;
    const rate = Math.max(0, arms[index].exposures) / elapsedDays;
    if (rate <= 0) return null;
    days = Math.max(days, remaining[index] / rate);
  }
  return Math.ceil(days);
}

function fallbackSe(mean: number, n: number) {
  return Math.max(Math.abs(mean), 1) / Math.sqrt(Math.max(n, 1));
}

function liftVsControl(arm: ArmStats, control: ArmStats, se: number) {
  const diff = arm.mean - control.mean;
  const margin = 1.96 * se;
  const denom = Math.abs(control.mean) > 1e-9 ? Math.abs(control.mean) : Math.max(Math.abs(arm.mean), margin, 1e-6);
  return {
    relativeDelta: diff / denom,
    interval: [(diff - margin) / denom, (diff + margin) / denom] as [number, number],
  };
}

function controlInterval(control: ArmStats): [number, number] {
  const margin = 1.96 * control.se;
  const denom = Math.max(Math.abs(control.mean), margin, 1e-6);
  return [-margin / denom, margin / denom];
}

function sampleNeed(
  arms: ExperimentArm[],
  metric: ExperimentMetricKind,
  metricLabel: string,
): ExperimentSampleNeed {
  const nouns = sampleNouns(metric, metricLabel);
  if (arms.length === 0) {
    return { exposures: MIN_SAMPLES, conversions: MIN_CONVERSIONS, ...nouns };
  }
  return arms.reduce(
    (need, arm) => {
      const remaining = remainingForArm(arm, metric);
      return {
        exposures: Math.max(need.exposures, remaining.exposures),
        conversions: Math.max(need.conversions, remaining.conversions),
        ...nouns,
      };
    },
    { exposures: 0, conversions: 0, ...nouns },
  );
}

function remainingForArm(arm: ExperimentArm, metric: ExperimentMetricKind) {
  const n = Math.max(0, arm.exposures);
  const conversions = Math.max(0, arm.conversions);
  const moreExposures = Math.max(0, MIN_SAMPLES - n);
  const moreConversions = Math.max(0, MIN_CONVERSIONS - conversions);
  if (metric === "conversion_rate") {
    const moreFailures = Math.max(0, MIN_CONVERSIONS - Math.max(0, n - conversions));
    return { exposures: Math.max(moreExposures, moreFailures), conversions: moreConversions };
  }
  return { exposures: moreExposures, conversions: moreConversions };
}

function sampleNouns(metric: ExperimentMetricKind, metricLabel: string) {
  if (metricLabel === "APPU D7") return { exposureNoun: "D7 install", conversionNoun: "paid" };
  if (metricLabel === "APPU D14") return { exposureNoun: "D14 install", conversionNoun: "paid" };
  if (metricLabel === "APPU D30") return { exposureNoun: "D30 install", conversionNoun: "paid" };
  if (metricLabel === "Avg sessions / day") return { exposureNoun: "user", conversionNoun: "session" };
  if (metricLabel === "Completion rate") return { exposureNoun: "visitor", conversionNoun: "completion" };
  if (metricLabel === "Revenue / visitor") return { exposureNoun: "visitor", conversionNoun: "paid" };
  if (metric === "conversion_rate") return { exposureNoun: "install", conversionNoun: "paid" };
  return { exposureNoun: "install", conversionNoun: "paid" };
}

function formatSampleNeed(needed: ExperimentSampleNeed | null) {
  if (!needed) return null;
  const parts = [
    needed.exposures > 0 ? `${formatCount(needed.exposures)} more ${pluralNoun(needed.exposureNoun, needed.exposures)}` : null,
    needed.conversions > 0 ? `${formatCount(needed.conversions)} more ${pluralNoun(needed.conversionNoun, needed.conversions)}` : null,
  ].filter((part): part is string => part != null);
  return parts.length > 0 ? `Need ${parts.join(", ")}` : null;
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

function pluralNoun(noun: string, count: number) {
  if (count === 1) return noun;
  if (noun === "paid" || noun === "retained") return noun;
  if (noun.endsWith("s")) return noun;
  return `${noun}s`;
}

function variantResult(
  arm: ArmStats,
  isControl: boolean,
  chanceToWin: number | null,
  chanceToBeatControl: number | null,
  relativeDelta: number | null,
  credibleInterval: [number, number] | null,
): VariantExperimentResult {
  const isSignificant =
    chanceToBeatControl != null &&
    (chanceToBeatControl > CONFIDENCE_LEVEL || chanceToBeatControl < 1 - CONFIDENCE_LEVEL);

  let status: VariantExperimentResult["status"] = "inconclusive";
  if (chanceToWin == null) status = "insufficient_data";
  else if (isControl) status = "control";
  else if (isSignificant && (chanceToBeatControl ?? 0) > CONFIDENCE_LEVEL) status = "winning";
  else if (isSignificant && (chanceToBeatControl ?? 1) < 1 - CONFIDENCE_LEVEL) status = "losing";

  return {
    key: arm.key,
    label: arm.label,
    isControl,
    metricValue: arm.mean,
    chanceToWin,
    chanceToBeatControl,
    relativeDelta,
    credibleInterval,
    isSignificant,
    status,
  };
}

function probabilityBest(stats: ArmStats[]) {
  const wins = Object.fromEntries(stats.map((arm) => [arm.key, 0]));
  const random = mulberry32(seedFromStats(stats));
  for (let i = 0; i < SIMULATION_RUNS; i += 1) {
    let bestKey = stats[0].key;
    let bestValue = Number.NEGATIVE_INFINITY;
    for (const arm of stats) {
      const sample = arm.se > 0 ? randomNormal(arm.mean, arm.se, random) : arm.mean;
      if (sample > bestValue) {
        bestValue = sample;
        bestKey = arm.key;
      }
    }
    wins[bestKey] += 1;
  }
  return Object.fromEntries(
    stats.map((arm) => [arm.key, wins[arm.key] / SIMULATION_RUNS]),
  ) as Record<string, number>;
}

function seedFromStats(stats: ArmStats[]) {
  return stats.reduce(
    (seed, arm) =>
      (Math.imul(seed, 31) + Math.round(arm.mean * 1_000_000) + Math.round(arm.se * 1_000_000)) | 0,
    2166136261,
  );
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randomNormal(mean: number, std: number, random: () => number) {
  const u = Math.max(Number.EPSILON, 1 - random());
  const v = random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + std * z;
}

function normalCdf(x: number, mean: number, std: number) {
  if (std <= 0) return x < mean ? 0 : 1;
  return 0.5 * (1 + erf((x - mean) / (std * Math.SQRT2)));
}

function erf(x: number) {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * abs);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-abs * abs));
  return sign * y;
}
