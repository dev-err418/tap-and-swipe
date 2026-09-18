import type { ExperimentAnalysis, VariantExperimentResult } from "@/lib/experiment-stats";

const WIN_COLOR = "#1d4ed8";
const LOSE_COLOR = "#f97316";
const WIN_SOFT = "color-mix(in oklch, #1d4ed8 12%, white)";
const LOSE_SOFT = "color-mix(in oklch, #f97316 14%, white)";

export function ExperimentWarningBadge({ analysis }: { analysis: ExperimentAnalysis }) {
  if (analysis.sufficientData) return null;
  return (
    <span
      className="inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={{ color: LOSE_COLOR, backgroundColor: LOSE_SOFT }}
    >
      {analysis.reason ?? "Not enough data yet."}
    </span>
  );
}

export default function ExperimentStats({ analysis }: { analysis: ExperimentAnalysis }) {
  if (analysis.variants.length === 0) return null;
  return (
    <div className="border-b border-black/[0.08] px-4 py-4">
      <div className="grid gap-6 sm:grid-cols-2">
        {analysis.variants.map((variant) => (
          <VariantChance key={variant.key} variant={variant} />
        ))}
      </div>
    </div>
  );
}

function VariantChance({ variant }: { variant: VariantExperimentResult }) {
  const chance = variant.chanceToWin;
  const tone = chanceTone(variant);

  return (
    <div className="grid gap-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate">{variant.label}</span>
          {variant.isControl ? (
            <span className="text-xs font-normal text-muted-foreground">Control</span>
          ) : null}
          {variant.relativeDelta != null ? (
            <span
              className="inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums"
              style={{
                color: (variant.relativeDelta ?? 0) >= 0 ? WIN_COLOR : LOSE_COLOR,
                backgroundColor: (variant.relativeDelta ?? 0) >= 0 ? WIN_SOFT : LOSE_SOFT,
              }}
            >
              {formatDelta(variant.relativeDelta)} vs control
            </span>
          ) : null}
        </p>
        <p
          className="shrink-0 text-right text-sm font-semibold tabular-nums"
          style={tone.color ? { color: tone.color } : undefined}
        >
          {chance == null ? "—" : formatPercent(chance)}
          <span className="ml-1 text-xs font-medium text-muted-foreground">chance to win</span>
        </p>
      </div>
      <CredibleIntervalBar variant={variant} />
    </div>
  );
}

function CredibleIntervalBar({ variant }: { variant: VariantExperimentResult }) {
  const interval = variant.isControl
    ? ([-0.015, 0.015] as [number, number])
    : variant.credibleInterval;
  if (!interval) {
    return <div className="h-3 rounded-full bg-foreground/[0.06]" />;
  }

  const bound = Math.max(0.25, Math.abs(interval[0]), Math.abs(interval[1]), Math.abs(variant.relativeDelta ?? 0));
  const toPercent = (value: number) => ((value + bound) / (2 * bound)) * 100;
  const start = Math.min(interval[0], interval[1]);
  const end = Math.max(interval[0], interval[1]);
  const zero = toPercent(0);
  const left = toPercent(start);
  const right = toPercent(end);

  const redRight = Math.min(zero, right);
  const greenLeft = Math.max(zero, left);

  return (
    <div className="relative h-3 rounded-full bg-foreground/[0.06]">
      {variant.isControl ? (
        <span
          className="absolute inset-y-0 rounded-full bg-foreground/25"
          style={{ left: `${left}%`, width: `${Math.max(6, right - left)}%` }}
        />
      ) : (
        <>
          {start < 0 ? (
            <span
              className="absolute inset-y-0 rounded-l-full"
              style={{
                left: `${left}%`,
                width: `${Math.max(0, redRight - left)}%`,
                backgroundColor: LOSE_COLOR,
                opacity: 0.88,
                borderTopRightRadius: end <= 0 ? 999 : 0,
                borderBottomRightRadius: end <= 0 ? 999 : 0,
              }}
            />
          ) : null}
          {end > 0 ? (
            <span
              className="absolute inset-y-0 rounded-r-full"
              style={{
                left: `${greenLeft}%`,
                width: `${Math.max(0, right - greenLeft)}%`,
                backgroundColor: WIN_COLOR,
                opacity: 0.88,
                borderTopLeftRadius: start >= 0 ? 999 : 0,
                borderBottomLeftRadius: start >= 0 ? 999 : 0,
              }}
            />
          ) : null}
        </>
      )}
      <span
        className="absolute top-[-3px] h-[18px] w-px bg-foreground/40"
        style={{ left: `${zero}%` }}
      />
    </div>
  );
}

function chanceTone(variant: VariantExperimentResult) {
  if (variant.isControl) return { color: undefined };
  if (variant.status === "winning" || (variant.relativeDelta ?? 0) > 0) return { color: WIN_COLOR };
  if (variant.status === "losing" || (variant.relativeDelta ?? 0) < 0) return { color: LOSE_COLOR };
  if ((variant.chanceToWin ?? 0) >= 0.55) return { color: WIN_COLOR };
  if ((variant.chanceToWin ?? 1) <= 0.45) return { color: LOSE_COLOR };
  return { color: undefined };
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDelta(value: number) {
  const percent = value * 100;
  return `${percent > 0 ? "+" : ""}${percent.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })}%`;
}
