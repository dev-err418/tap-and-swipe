import { DashboardCard } from "@/components/analytics/DashboardCard";
import { appExperimentFlow, type ExperimentFlowEdge, type ExperimentFlowNode } from "@/lib/app-experiment-flow";
import type {
  MobileAppExperiment,
  MobileAppExperimentScoreMetric,
  MobileAppExperimentVariant,
} from "@/lib/mobile-app-analytics";
import type { NativePaywallReport, NativePaywallRow } from "@/lib/native-paywall-analytics";
import { analyzeExperiment, type ExperimentArm } from "@/lib/experiment-stats";

const TONES = {
  blue: { line: "#a8b9eb", ink: "#284dae", fill: "#f5f7ff", border: "#dce4f8" },
  orange: { line: "#ebc09c", ink: "#a95317", fill: "#fff8f1", border: "#f1dfcf" },
  neutral: { line: "#c8cbd2", ink: "#525866", fill: "#fafafa", border: "#e8e9ec" },
};
const BEST_TONES = {
  blue: { line: "#6f89d8", ink: "#284dae", fill: "#e5ebff" },
  orange: { line: "#d98245", ink: "#a95317", fill: "#fff0e4" },
  neutral: { line: "#8f96a3", ink: "#525866", fill: "#f0f1f3" },
};

export default function AppExperimentMap({
  appId,
  experiments = [],
  nativePaywalls = null,
}: {
  appId: string;
  experiments?: MobileAppExperiment[];
  nativePaywalls?: NativePaywallReport | null;
}) {
  const flow = appExperimentFlow(appId);
  if (!flow) return null;
  const nodes = new Map(flow.nodes.map((node) => [node.id, node]));
  const bestVariants = currentBestVariantResults(experiments);
  const experimentAppu = currentExperimentAppu(experiments);
  const paywallMetrics = currentPaywallMetrics(flow.nodes, nativePaywalls);
  const candidateBestNodeIds = new Set(flow.nodes.flatMap((node) => {
    const experimentBest = node.experimentId ? bestVariants.get(node.experimentId) : null;
    const isExperimentBest = node.paywallMetric == null
      && node.experimentId != null
      && node.variantId != null
      && node.variantId === experimentBest?.key;
    const isPaywallBest = paywallMetrics.get(node.id)?.isBest === true;
    return isExperimentBest || isPaywallBest ? [node.id] : [];
  }));
  const bestPathNodeIds = currentBestPathNodeIds(flow.nodes, flow.edges, candidateBestNodeIds);

  return (
    <DashboardCard
      title="Experiment map"
      action={<span className="text-xs text-muted-foreground">Configured allocation · not observed traffic</span>}
      contentClassName="px-4 pb-4 pt-1"
    >
      <div
        className="overflow-x-auto rounded-xl scrollbar-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        tabIndex={0}
        role="region"
        aria-label={`${appId === "glow" ? "Glow" : "Poky"} onboarding to paywall progression; scroll horizontally to follow the flow`}
      >
        <svg
          viewBox={`0 0 ${flow.width} ${flow.height}`}
          className="block w-full"
          style={{ minWidth: flow.width }}
          role="img"
          aria-label="Start onboarding, then follow the branches left to right. Percentage badges show the allocation at each split."
        >
          <desc>{flow.edges.map((edge) => `${nodes.get(edge.from)!.label} to ${nodes.get(edge.to)!.label}${edge.label ? `: ${edge.label}` : ""}${edge.conditional ? " only on cancel or dismissal" : ""}.`).join(" ")}</desc>
          {flow.stages.map((stage) => (
            <text key={stage.label} x={stage.x} y={20} fill="#717171" fontSize={12}>{stage.label}</text>
          ))}
          {flow.edges.map((edge) => {
            const from = nodes.get(edge.from)!;
            const to = nodes.get(edge.to)!;
            const tone = TONES[to.tone];
            const isBestPath = bestPathNodeIds.has(edge.from) && bestPathNodeIds.has(edge.to);
            const pathTone = to.tone === "neutral" ? BEST_TONES[from.tone] : BEST_TONES[to.tone];
            const pathLine = isBestPath ? pathTone.line : tone.line;
            const pathInk = isBestPath ? pathTone.ink : tone.ink;
            const pathFill = isBestPath ? pathTone.fill : tone.fill;
            const startX = from.x + from.width + (from.kind === "start" ? 6 : 0);
            const curveX = startX + (to.x - startX) * 0.4;
            const badgeX = to.x - 43;
            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  d={`M ${startX} ${from.y} C ${curveX} ${from.y}, ${curveX} ${to.y}, ${to.x - 28} ${to.y} H ${to.x}`}
                  fill="none" stroke={pathLine} strokeWidth={isBestPath ? 3 : 1.5}
                  strokeDasharray={edge.conditional ? "4 4" : undefined}
                />
                <path d={`M ${to.x - 5} ${to.y - 3} L ${to.x} ${to.y} L ${to.x - 5} ${to.y + 3}`} fill="none" stroke={pathLine} strokeWidth={isBestPath ? 3 : 1.5} />
                {edge.label ? (
                  <g>
                    <rect x={badgeX - 23} y={to.y - 11} width={46} height={22} rx={11} fill={pathFill} stroke={pathLine} strokeWidth={isBestPath ? 1.5 : 1} />
                    <text x={badgeX} y={to.y} dy="0.35em" textAnchor="middle" fill={pathInk} fontSize={12} fontWeight={isBestPath ? 700 : undefined} className="tabular-nums">{edge.label}</text>
                  </g>
                ) : null}
              </g>
            );
          })}
          {flow.nodes.map((node) => {
            const tone = TONES[node.tone];
            const bestTone = BEST_TONES[node.tone];
            const bestResult = node.experimentId ? bestVariants.get(node.experimentId) : null;
            const appuOnly = node.experimentId === "poky-native-recovery-holdout"
              ? experimentAppu.get(`${node.experimentId}|${node.variantId}`)
              : undefined;
            const isExperimentBest = bestPathNodeIds.has(node.id)
              && node.paywallMetric == null
              && node.experimentId != null
              && node.variantId === bestResult?.key;
            const paywallMetric = paywallMetrics.get(node.id);
            const showsPaywallMetrics = node.paywallMetric != null;
            const showsAppuOnly = appuOnly !== undefined;
            const isBest = isExperimentBest || (bestPathNodeIds.has(node.id) && paywallMetric?.isBest === true);
            const cardDetail = showsAppuOnly
              ? `APPU ${formatAppu(appuOnly)}`
              : isExperimentBest
                ? formatBestResult(bestResult)
                : showsPaywallMetrics
                ? formatPaywallMetric(paywallMetric)
                : node.detail;
            if (node.kind === "start") {
              return (
                <g key={node.id}>
                  <circle cx={node.x} cy={node.y} r={6} fill={tone.ink} />
                  <text x={node.x} y={node.y + 28} textAnchor="middle" fill="#717171" fontSize={12}>Start</text>
                  <text x={node.x} y={node.y + 44} textAnchor="middle" fill="#717171" fontSize={10}>onboarding</text>
                </g>
              );
            }
            return (
              <g key={node.id}>
                <rect
                  x={node.x} y={node.y - 26} width={node.width} height={52} rx={13}
                  fill={isBest ? bestTone.fill : tone.fill}
                  stroke={isBest ? bestTone.line : tone.border}
                  strokeWidth={isBest ? 2 : 1}
                />
                <text x={node.x + 12} y={node.y + (cardDetail ? -4 : 4)} fill="#252525" fontSize={13}>{node.label}</text>
                {cardDetail ? (
                  <text
                    x={node.x + 12} y={node.y + 14}
                    fill={showsPaywallMetrics || showsAppuOnly ? TONES.orange.ink : isBest ? bestTone.ink : "#717171"}
                    fontSize={isExperimentBest && !showsAppuOnly ? 9.5 : 10.5}
                    fontWeight={isBest || showsPaywallMetrics || showsAppuOnly ? 600 : undefined}
                    className={isBest || showsPaywallMetrics || showsAppuOnly ? "tabular-nums" : undefined}
                  >
                    {cardDetail}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 space-y-1 text-xs leading-relaxed text-muted-foreground">
        {flow.notes.map((note) => <p key={note}>{note}</p>)}
      </div>
    </DashboardCard>
  );
}

/** Keep repeated downstream variants on one winning route. Neutral merge points
 * stay available so independently scored paywall/recovery stages still render.
 */
export function currentBestPathNodeIds(nodes: ExperimentFlowNode[], edges: ExperimentFlowEdge[], candidateBestNodeIds: Set<string>) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const active = new Set(nodes.filter((node) => node.kind === "start" || (!node.experimentId && !node.paywallMetric)).map((node) => node.id));
  for (let pass = 0; pass < nodes.length; pass++) {
    let changed = false;
    for (const edge of edges) {
      const target = byId.get(edge.to);
      if (!target || active.has(edge.to) || !active.has(edge.from)) continue;
      if ((target.experimentId || target.paywallMetric) && !candidateBestNodeIds.has(target.id)) continue;
      active.add(target.id);
      changed = true;
    }
    if (!changed) break;
  }
  return active;
}

type PaywallMetricNode = {
  id: string;
  paywallMetric?: { experiment: string; variant: string; language: string };
};

export function currentPaywallMetrics(nodes: PaywallMetricNode[], report: NativePaywallReport | null) {
  const metrics = new Map<string, { appu: number | null; conversionRate: number | null; isBest: boolean }>();
  for (const node of nodes) {
    if (!node.paywallMetric) continue;
    const source = node.paywallMetric;
    const group = report?.status === "ready"
      ? report.groups.find((candidate) => candidate.experiment === source.experiment && candidate.language === source.language)
      : null;
    const row = group?.paywalls.find((candidate) => matchesPaywallVariant(candidate, source.variant));
    const appu = row && row.users > 0 ? row.proceeds / row.users : null;
    const ranked = group?.paywalls.flatMap((candidate) => candidate.users > 0
      ? [{ id: candidate.id, appu: candidate.proceeds / candidate.users }]
      : []) ?? [];
    const maximum = ranked.length > 1 ? Math.max(...ranked.map((candidate) => candidate.appu)) : null;
    const leaders = maximum == null ? [] : ranked.filter((candidate) => candidate.appu === maximum);
    metrics.set(node.id, {
      appu,
      conversionRate: row && row.views > 0 ? row.conversions / row.views : null,
      isBest: row != null && leaders.length === 1 && leaders[0].id === row.id,
    });
  }
  return metrics;
}

function matchesPaywallVariant(row: NativePaywallRow, variant: string) {
  return row.paywall === variant || row.id === variant || row.id.startsWith(`${variant}|`);
}

function formatAppu(value: number | null | undefined) {
  return value == null ? "—" : new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatConversionRate(value: number | null | undefined) {
  return value == null ? "—" : `${(value * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

function formatPaywallMetric(metric: { appu: number | null; conversionRate: number | null } | null | undefined) {
  return `APPU ${formatAppu(metric?.appu)} · CR ${formatConversionRate(metric?.conversionRate)}`;
}

export function currentBestVariants(experiments: MobileAppExperiment[]) {
  return new Map([...currentBestVariantResults(experiments)].map(([id, result]) => [id, result.key]));
}

function currentExperimentAppu(experiments: MobileAppExperiment[]) {
  const values = new Map<string, number>();
  for (const experiment of experiments) for (const variant of experiment.variants) {
    const users = variant.users > 0 ? variant.users : variant.installs;
    if (users > 0 && Number.isFinite(variant.proceeds)) values.set(`${experiment.id}|${variant.key}`, variant.proceeds / users);
  }
  return values;
}

export function currentBestVariantResults(experiments: MobileAppExperiment[]) {
  const best = new Map<string, { key: string; confidence: number | null; lift: number | null }>();
  for (const experiment of experiments) {
    const metrics = [...new Set([...(experiment.scoreMetrics ?? ["appu"]), "appu" as const])];
    const scored = metrics.flatMap((metric) => {
      const ranked = experiment.variants.map((variant) => ({
        key: variant.key,
        value: scoreValue(variant, metric, experiment.sessionDays),
      }));
      if (ranked.length < 2 || ranked.some((row) => row.value == null)) return [];
      const ordered = [...ranked].sort((a, b) => b.value! - a.value!);
      return ordered[0].value === ordered[1].value ? [] : [{ metric, ordered }];
    })[0];
    if (!scored) continue;
    const { metric, ordered } = scored;
    const analysis = analyzeExperiment(scoreArms(experiment, metric), metric === "download_paid" ? "conversion_rate" : "revenue_per_visitor", metric);
    const winner = analysis.variants.find((variant) => variant.key === ordered[0].key);
    const runnerUp = ordered[1].value!;
    best.set(experiment.id, {
      key: ordered[0].key,
      confidence: winner?.chanceToWin ?? null,
      lift: runnerUp > 0 ? ordered[0].value! / runnerUp - 1 : null,
    });
  }
  return best;
}

function scoreArms(experiment: MobileAppExperiment, metric: MobileAppExperimentScoreMetric): ExperimentArm[] {
  return experiment.variants.map((variant) => ({
    key: variant.key,
    label: variant.label,
    exposures: scoreExposure(variant, metric),
    conversions: metric === "sessions_per_day" ? Math.min(variant.users, variant.sessions) : variant.paid,
    revenue: scoreRevenue(variant, metric, experiment.sessionDays),
  }));
}

function scoreExposure(variant: MobileAppExperimentVariant, metric: MobileAppExperimentScoreMetric) {
  if (metric === "sessions_per_day") return variant.users;
  if (metric === "appu_d7") return variant.installsD7;
  if (metric === "appu_d14") return variant.installsD14;
  if (metric === "appu_d30") return variant.installsD30;
  return variant.installs;
}

function scoreRevenue(variant: MobileAppExperimentVariant, metric: MobileAppExperimentScoreMetric, sessionDays = 1) {
  if (metric === "sessions_per_day") return variant.sessions / Math.max(1, sessionDays);
  if (metric === "download_paid") return 0;
  if (metric === "appu_d7") return variant.proceedsD7;
  if (metric === "appu_d14") return variant.proceedsD14;
  if (metric === "appu_d30") return variant.proceedsD30;
  return variant.proceeds;
}

function formatBestResult(result: { confidence: number | null; lift: number | null } | null | undefined) {
  const confidence = result?.confidence == null ? "— conf" : `${Math.round(result.confidence * 100)}% conf`;
  const lift = result?.lift == null ? null : `+${(result.lift * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}% better`;
  return lift ? `${confidence} · ${lift}` : confidence;
}

function scoreValue(
  variant: MobileAppExperimentVariant,
  metric: MobileAppExperimentScoreMetric,
  sessionDays = 1,
) {
  if (metric === "sessions_per_day") return ratioOrNull(variant.sessions, variant.users * Math.max(1, sessionDays));
  if (metric === "download_paid") return ratioOrNull(variant.paid, variant.installs);
  if (metric === "appu_d7") return ratioOrNull(variant.proceedsD7, variant.installsD7);
  if (metric === "appu_d14") return ratioOrNull(variant.proceedsD14, variant.installsD14);
  if (metric === "appu_d30") return ratioOrNull(variant.proceedsD30, variant.installsD30);
  return ratioOrNull(variant.proceeds, variant.installs);
}

function ratioOrNull(part: number, total: number) {
  return total > 0 && Number.isFinite(part) && Number.isFinite(total) ? part / total : null;
}
