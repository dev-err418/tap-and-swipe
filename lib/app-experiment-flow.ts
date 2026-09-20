import { appExperimentMap, type AppExperimentMapDefinition } from "./app-experiment-map";

export type ExperimentFlowNode = {
  id: string; x: number; y: number; width: number;
  label: string; detail?: string;
  tone: "blue" | "orange" | "neutral";
  kind?: "start";
  experimentId?: string;
  variantId?: string;
  paywallMetric?: { experiment: string; variant: string; language: string };
};
export type ExperimentFlowEdge = { from: string; to: string; label?: string; conditional?: boolean };
export type ExperimentFlow = {
  width: number; height: number;
  nodes: ExperimentFlowNode[]; edges: ExperimentFlowEdge[];
  stages: { x: number; label: string }[];
  notes: string[];
};

/** Presentation order, not assignment timing: independent, sticky buckets remain independent. */
export function appExperimentFlow(appId: string): ExperimentFlow | null {
  const map = appExperimentMap(appId);
  if (!map) return null;
  return appId === "glow" ? glowFlow(map) : pokyFlow(map);
}

function glowFlow(map: AppExperimentMapDefinition): ExperimentFlow {
  const [onboarding, paywalls] = map.tests;
  const nodes: ExperimentFlowNode[] = [
    { id: "start", x: 36, y: 168, width: 0, label: "Onboarding", kind: "start", tone: "blue" },
    { id: "placements", x: 390, y: 168, width: 162, label: "Paywall entry", detail: "Same variant everywhere", tone: "neutral" },
  ];
  const edges: ExperimentFlowEdge[] = [];
  onboarding.branches.forEach((branch, index) => {
    nodes.push({
      id: branch.id, x: 164, y: 112 + index * 112, width: 142, label: branch.label, tone: "blue",
      experimentId: onboarding.id, variantId: branch.id,
    });
    edges.push({ from: "start", to: branch.id, label: `${branch.percent}%` }, { from: branch.id, to: "placements" });
  });
  paywalls.branches.forEach((branch, index) => {
    nodes.push({
      id: branch.id, x: 684, y: 64 + index * 104, width: 180, label: branch.label, tone: "orange",
      paywallMetric: { experiment: paywalls.id, variant: branch.id, language: "all" },
    });
    edges.push({ from: "placements", to: branch.id, label: `${branch.percent}%` });
  });
  return {
    width: 898, height: 320, nodes, edges,
    stages: [{ x: 164, label: "Onboarding flow" }, { x: 390, label: "Placements" }, { x: 684, label: "Native paywalls" }],
    notes: ["The 25/25/50 paywall split applies within English / fallback, Spanish and German, independently of IAM / Copy.", ...map.notes],
  };
}

function pokyFlow(map: AppExperimentMapDefinition): ExperimentFlow {
  const [plan, background, english, localized, recovery] = map.tests;
  const nodes: ExperimentFlowNode[] = [
    { id: "start", x: 36, y: 268, width: 0, label: "Onboarding", kind: "start", tone: "blue" },
    { id: "language", x: 618, y: 268, width: 144, label: "Paywall language", detail: "English is the fallback", tone: "neutral" },
    { id: "cancel", x: 1166, y: 268, width: 160, label: "Cancel / dismiss", detail: "Any origin placement", tone: "neutral" },
  ];
  const edges: ExperimentFlowEdge[] = [];
  background.branches.forEach((bg, bgIndex) => {
    const bgId = `background-${bg.id}`;
    const y = 148 + bgIndex * 240;
    nodes.push({
      id: bgId, x: 160, y, width: 150, label: bg.id === "control" ? "Original" : "Warm experience",
      detail: "50/50 in next release", tone: "blue", experimentId: background.id, variantId: bg.id,
    });
    edges.push({ from: "start", to: bgId, label: `${bg.percent}%` });
    plan.branches.forEach((branch, planIndex) => {
      const id = `${bgId}-${branch.id}`;
      nodes.push({ id, x: 398, y: y - 60 + planIndex * 120, width: 150, label: branch.label,
        detail: `${bg.percent * branch.percent / 100}% of new assignments`, tone: "blue",
        experimentId: plan.id, variantId: branch.id });
      edges.push({ from: bgId, to: id, label: `${branch.percent}%` }, { from: id, to: "language" });
    });
  });
  const offers = [
    ...english.branches.map((branch, index) => ({
      id: branch.id, label: index === 0 ? "🇬🇧 High - 1" : "🇬🇧 Name - 2", language: "🇬🇧 English / fallback", languageCode: "en",
      metricVariant: index === 0 ? "high" : "name", percent: branch.percent,
    })),
    ...[{ id: "es", label: "🇪🇸 Spanish" }, { id: "de", label: "🇩🇪 German" }, { id: "fr", label: "🇫🇷 French" }].map((language) => ({
      id: `name-2-${language.id}`, label: `${language.label.slice(0, 4)} Name - 2`, language: language.label, languageCode: language.id,
      metricVariant: "name", percent: localized.branches[0].percent,
    })),
  ];
  offers.forEach((offer, index) => {
    nodes.push({
      id: offer.id, x: 902, y: 68 + index * 100, width: 176, label: offer.label, detail: offer.language, tone: "orange",
      paywallMetric: {
        experiment: `poky_native_main_v1_${offer.languageCode}`,
        variant: offer.metricVariant,
        language: offer.languageCode,
      },
    });
    edges.push({ from: "language", to: offer.id, label: `${offer.percent}%` }, { from: offer.id, to: "cancel", conditional: true });
  });
  recovery.branches.forEach((branch, index) => {
    nodes.push({ id: branch.id, x: 1418, y: 208 + index * 120, width: 164, label: branch.label,
      detail: branch.id === "recovery" ? "Localized · once only" : "Remains hard-gated", tone: "orange",
      experimentId: recovery.id, variantId: branch.id });
    edges.push({ from: "cancel", to: branch.id, label: `${branch.percent}%` });
  });
  return {
    width: 1608, height: 522, nodes, edges,
    stages: [
      { x: 160, label: "App experience" }, { x: 398, label: "Plan flow" },
      { x: 618, label: "Audience" }, { x: 902, label: "Main paywalls" },
      { x: 1166, label: "Recovery trigger" }, { x: 1418, label: "Recovery test" },
    ],
    notes: ["Paywall percentages apply within each language, not across languages. Dashed lines apply only after cancelling a purchase or dismissing a main paywall.", ...map.notes],
  };
}
