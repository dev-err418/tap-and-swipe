import { DashboardCard } from "@/components/analytics/DashboardCard";
import { appExperimentFlow } from "@/lib/app-experiment-flow";

const TONES = {
  blue: { line: "#a8b9eb", ink: "#284dae", fill: "#f5f7ff", border: "#dce4f8" },
  orange: { line: "#ebc09c", ink: "#a95317", fill: "#fff8f1", border: "#f1dfcf" },
  neutral: { line: "#c8cbd2", ink: "#525866", fill: "#fafafa", border: "#e8e9ec" },
};

export default function AppExperimentMap({ appId }: { appId: string }) {
  const flow = appExperimentFlow(appId);
  if (!flow) return null;
  const nodes = new Map(flow.nodes.map((node) => [node.id, node]));

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
            const startX = from.x + from.width + (from.kind === "start" ? 6 : 0);
            const curveX = startX + (to.x - startX) * 0.4;
            const badgeX = to.x - 43;
            return (
              <g key={`${edge.from}-${edge.to}`}>
                <path
                  d={`M ${startX} ${from.y} C ${curveX} ${from.y}, ${curveX} ${to.y}, ${to.x - 28} ${to.y} H ${to.x}`}
                  fill="none" stroke={tone.line} strokeWidth={1.5}
                  strokeDasharray={edge.conditional ? "4 4" : undefined}
                />
                <path d={`M ${to.x - 5} ${to.y - 3} L ${to.x} ${to.y} L ${to.x - 5} ${to.y + 3}`} fill="none" stroke={tone.line} strokeWidth={1.5} />
                {edge.label ? (
                  <g>
                    <rect x={badgeX - 23} y={to.y - 11} width={46} height={22} rx={11} fill={tone.fill} stroke={tone.line} />
                    <text x={badgeX} y={to.y} dy="0.35em" textAnchor="middle" fill={tone.ink} fontSize={12} className="tabular-nums">{edge.label}</text>
                  </g>
                ) : null}
              </g>
            );
          })}
          {flow.nodes.map((node) => {
            const tone = TONES[node.tone];
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
                <rect x={node.x} y={node.y - 26} width={node.width} height={52} rx={13} fill={tone.fill} stroke={tone.border} />
                <text x={node.x + 12} y={node.y + (node.detail ? -4 : 4)} fill="#252525" fontSize={13}>{node.label}</text>
                {node.detail ? <text x={node.x + 12} y={node.y + 14} fill="#717171" fontSize={10.5}>{node.detail}</text> : null}
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
