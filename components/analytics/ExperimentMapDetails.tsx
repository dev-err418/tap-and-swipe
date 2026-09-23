import type { ExperimentFlowNode } from "@/lib/app-experiment-flow";
import type { MobileAppExperiment } from "@/lib/mobile-app-analytics";
import type { NativePaywallReport } from "@/lib/native-paywall-analytics";
import type { JournalPracticeReport } from "@/lib/journal-practice-analytics";
import { experimentMapDetailTarget, experimentMapPaywallGroup } from "@/lib/experiment-map-details";
import AppExperimentCard from "./AppExperimentCard";
import JournalPracticePanel from "./JournalPracticePanel";
import { NativePaywallResultsTable } from "./NativePaywallsPanel";

export default function ExperimentMapDetails({ node, language, experiments, nativePaywalls, journalPractice }: {
  node: ExperimentFlowNode; language?: string; experiments: MobileAppExperiment[];
  nativePaywalls: NativePaywallReport | null; journalPractice: JournalPracticeReport | null;
}) {
  const target = experimentMapDetailTarget(node, language, nativePaywalls);
  if (target?.kind === "journal") return <JournalPracticePanel report={journalPractice} />;
  if (target?.kind === "paywalls") {
    const group = experimentMapPaywallGroup(node, nativePaywalls, language);
    if (!group) return <Empty>{!nativePaywalls || nativePaywalls.status === "unavailable"
      ? "Paywall stats are unavailable. Refresh to retry." : "No results for this test and language yet."}</Empty>;
    return <NativePaywallResultsTable title={group.name} rows={group.paywalls} experiment={group.experiment} language={group.language} flow={Boolean(group.outcomeScope)} />;
  }
  const experiment = experiments.find((experiment) => experiment.id === target?.experimentId);
  if (!experiment?.variants.length) return <Empty>No results for this test and language yet.</Empty>;
  // Joint branches display total APPU on the map, so their opened comparison does too.
  const comparison: MobileAppExperiment = node.cohortMetric
    ? { ...experiment, scoreMetrics: ["appu", "download_paid"] } : experiment;
  return <AppExperimentCard experiment={comparison} />;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p role="status" className="rounded-2xl bg-white p-8 text-center text-sm text-muted-foreground">{children}</p>;
}
