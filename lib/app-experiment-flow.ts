import { appExperimentMap, type AppExperimentMapDefinition } from "./app-experiment-map";
import { formatPaywallAllocation } from "./native-paywall-allocation";

export type ExperimentFlowNode = {
  id: string; x: number; y: number; width: number;
  label: string; detail?: string;
  tone: "blue" | "orange" | "neutral";
  kind?: "start";
  experimentId?: string;
  variantId?: string;
  /** Disjoint joint-assignment cohorts; parents sum the same leaves as their children. */
  cohortMetric?: { experiment: string; variants: string[] };
  paywallMetric?: { experiment: string; variant: string; language: string };
  /** Structural cards open the comparison at the next stage. */
  statsTarget?: { experimentId?: string; paywallExperiment?: string; language?: string };
};
export type ExperimentFlowEdge = { from: string; to: string; label?: string; conditional?: boolean };
export type ExperimentFlow = {
  width: number; height: number;
  nodes: ExperimentFlowNode[]; edges: ExperimentFlowEdge[];
  stages: { x: number; label: string }[];
  notes: string[];
};

/** Presentation order, not assignment timing: independent, sticky buckets remain independent. */
export function appExperimentFlow(appId: string, selectedLanguage?: string): ExperimentFlow | null {
  const map = appExperimentMap(appId);
  if (!map) return null;
  if (appId === "glow") return glowFlow(map);
  if (appId === "versy") return versyFlow(map);
  return pokyFlow(map, selectedLanguage);
}

function versyFlow(map: AppExperimentMapDefinition): ExperimentFlow {
  const experiment = map.tests[0];
  const nodes: ExperimentFlowNode[] = [
    { id: "start", x: 36, y: 200, width: 0, label: "Onboarding", kind: "start", tone: "blue" },
    { id: "completion", x: 470, y: 200, width: 170, label: "Widget screen reached", tone: "neutral",
      statsTarget: { experimentId: experiment.id } },
  ];
  const edges: ExperimentFlowEdge[] = [];
  experiment.branches.forEach((branch, index) => {
    nodes.push({ id: branch.id, x: 168, y: 144 + index * 112, width: 170,
      label: branch.label, tone: "blue", experimentId: experiment.id, variantId: branch.id });
    edges.push({ from: "start", to: branch.id, label: `${branch.percent}%` });
    edges.push({ from: branch.id, to: "completion" });
  });
  return {
    width: 680, height: 400, nodes, edges,
    stages: [{ x: 36, label: "Assignment" }, { x: 168, label: "Onboarding flow" },
      { x: 470, label: "Completion" }],
    notes: map.notes,
  };
}

function glowFlow(map: AppExperimentMapDefinition): ExperimentFlow {
  const [onboarding, paywalls, journalPractice] = map.tests;
  const centerY = 64 + (paywalls.branches.length - 1) * 52;
  const nodes: ExperimentFlowNode[] = [
    { id: "start", x: 36, y: centerY, width: 0, label: "Onboarding", kind: "start", tone: "blue" },
    { id: "placements", x: 390, y: centerY, width: 162, label: "Paywall entry", detail: "Same variant everywhere", tone: "neutral",
      statsTarget: { paywallExperiment: paywalls.id, language: "all" } },
  ];
  const edges: ExperimentFlowEdge[] = [];
  onboarding.branches.forEach((branch, index) => {
    nodes.push({
      id: branch.id, x: 164, y: centerY - 56 + index * 112, width: 142, label: branch.label, tone: "blue",
      experimentId: onboarding.id, variantId: branch.id,
    });
    edges.push({ from: "start", to: branch.id, label: `${branch.percent}%` }, { from: branch.id, to: "placements" });
  });
  paywalls.branches.forEach((branch, index) => {
    nodes.push({
      id: branch.id, x: 684, y: 64 + index * 104, width: 180, label: branch.label, tone: "orange",
      paywallMetric: { experiment: paywalls.id, variant: branch.id, language: "all" },
    });
    edges.push({ from: "placements", to: branch.id, label: formatPaywallAllocation(branch.percent) });
  });
  nodes.push({ id: "home", x: 960, y: centerY, width: 140, label: "Home button", detail: "Next app release", tone: "neutral",
    statsTarget: { experimentId: journalPractice.id } });
  paywalls.branches.forEach((branch) => edges.push({ from: branch.id, to: "home" }));
  journalPractice.branches.forEach((branch, index) => {
    nodes.push({ id: `home-${branch.id}`, x: 1210, y: centerY - 56 + index * 112, width: 150,
      label: branch.label, tone: "blue", experimentId: journalPractice.id, variantId: branch.id });
    edges.push({ from: "home", to: `home-${branch.id}`, label: `${branch.percent}%` });
  });
  return {
    width: 1396, height: 112 + (paywalls.branches.length - 1) * 104, nodes, edges,
    stages: [{ x: 164, label: "Onboarding flow" }, { x: 390, label: "Placements" }, { x: 684, label: "Native paywalls" }, { x: 1210, label: "Journal VS Practice" }],
    notes: ["Each Yearly/Weekly design receives 25%; yr_49, yr_59 and yr_34 share the remaining 50% equally (~17% each). Displayed percentages are rounded; the actual allocation totals 100%. The split applies within each language, independently of IAM / Copy.", ...map.notes],
  };
}

function pokyFlow(map: AppExperimentMapDefinition, selectedLanguage?: string): ExperimentFlow {
  const [plan, background, english, localized, recovery] = map.tests;
  const nodes: ExperimentFlowNode[] = [
    { id: "start", x: 36, y: 268, width: 0, label: "Onboarding", kind: "start", tone: "blue" },
    { id: "language", x: 618, y: 268, width: 144, label: "Paywall language", detail: "English is the fallback", tone: "neutral",
      statsTarget: { paywallExperiment: `poky_native_main_v1_${selectedLanguage ?? "en"}`, language: selectedLanguage ?? "en" } },
    { id: "cancel", x: 1166, y: 268, width: 160, label: "Cancel / dismiss", detail: "Any origin placement", tone: "neutral",
      statsTarget: { experimentId: recovery.id } },
  ];
  const edges: ExperimentFlowEdge[] = [];
  background.branches.forEach((bg, bgIndex) => {
    const bgId = `background-${bg.id}`;
    const experience = bg.id === "control" ? "original" : "chat";
    const y = 148 + bgIndex * 240;
    nodes.push({
      id: bgId, x: 160, y, width: 150, label: bg.id === "control" ? "Original" : "Warm experience",
      tone: "blue", cohortMetric: { experiment: "poky-onboarding-abcd", variants: [`extra_${experience}`, `intro_${experience}`] },
    });
    edges.push({ from: "start", to: bgId, label: `${bg.percent}%` });
    plan.branches.forEach((branch, planIndex) => {
      const id = `${bgId}-${branch.id}`;
      nodes.push({ id, x: 398, y: y - 60 + planIndex * 120, width: 150, label: branch.label,
        tone: "blue",
        cohortMetric: { experiment: "poky-onboarding-abcd", variants: [`${branch.id === "control" ? "extra" : "intro"}_${experience}`] } });
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
  const visibleOffers = selectedLanguage
    ? offers.filter((offer) => offer.languageCode === selectedLanguage)
    : offers;
  const firstOfferY = 268 - (visibleOffers.length - 1) * 50;
  visibleOffers.forEach((offer, index) => {
    nodes.push({
      id: offer.id, x: 902, y: firstOfferY + index * 100, width: 176, label: offer.label, detail: offer.language, tone: "orange",
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
      tone: "orange",
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
    notes: [],
  };
}
