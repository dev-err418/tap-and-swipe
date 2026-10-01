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
  const [onboarding, plans, access, price] = map.tests;
  const nodes: ExperimentFlowNode[] = [
    { id: "start", x: 36, y: 212, width: 0, label: "New install", kind: "start", tone: "blue" },
  ];
  const edges: ExperimentFlowEdge[] = [];
  onboarding.branches.forEach((branch, index) => {
    nodes.push({ id: branch.id, x: 168, y: 144 + index * 136, width: 170,
      label: branch.label, tone: "blue", experimentId: onboarding.id, variantId: branch.id });
    edges.push({ from: "start", to: branch.id, label: `${branch.percent}%` });
  });
  plans.branches.forEach((branch, index) => {
    const id = `plans-${branch.id}`;
    nodes.push({ id, x: 430, y: 144 + index * 136, width: 170,
      label: branch.label, tone: "orange", experimentId: plans.id, variantId: branch.id });
    onboarding.branches.forEach((parent) => edges.push({ from: parent.id, to: id, label: "50%" }));
  });
  access.branches.forEach((branch, index) => {
    const id = `access-${branch.id}`;
    nodes.push({ id, x: 692, y: 144 + index * 136, width: 170,
      label: branch.label, tone: "orange", experimentId: access.id, variantId: branch.id });
    plans.branches.forEach((parent) => edges.push({ from: `plans-${parent.id}`, to: id, label: "50%" }));
  });
  price.branches.forEach((branch, index) => {
    const id = `price-${index}`;
    nodes.push({ id, x: 954, y: 80 + index * 136, width: 190,
      label: branch.label, tone: "orange", experimentId: price.id, variantId: branch.id });
    access.branches.forEach((parent) => edges.push({ from: `access-${parent.id}`, to: id, label: "⅓" }));
  });
  return {
    width: 1190, height: 424, nodes, edges,
    stages: [{ x: 168, label: "Onboarding flow" }, { x: 430, label: "Plans" },
      { x: 692, label: "Access" }, { x: 954, label: "Yearly price" }],
    notes: map.notes,
  };
}

function glowFlow(map: AppExperimentMapDefinition): ExperimentFlow {
  const [onboarding, , paywalls] = map.tests;
  const centerY = 64 + (paywalls.branches.length - 1) * 52;
  const nodes: ExperimentFlowNode[] = [
    { id: "start", x: 36, y: centerY, width: 0, label: "Prepared", kind: "start", tone: "blue" },
    { id: "placements", x: 390, y: centerY, width: 162, label: "Paywall entry", detail: "Same variant everywhere", tone: "neutral",
      statsTarget: { paywallExperiment: paywalls.id, language: "all" } },
  ];
  const edges: ExperimentFlowEdge[] = [];
  onboarding.branches.forEach((branch, index) => {
    nodes.push({
      id: branch.id, x: 164, y: centerY - 56 + index * 112, width: 160, label: branch.label, detail: "Enrollment off", tone: "blue",
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
  nodes.push({ id: "home", x: 960, y: centerY, width: 140, label: "Practice", detail: "Everyone", tone: "neutral" });
  paywalls.branches.forEach((branch) => edges.push({ from: branch.id, to: "home" }));
  return {
    width: 1136, height: 112 + (paywalls.branches.length - 1) * 104, nodes, edges,
    stages: [{ x: 164, label: "Onboarding flow" }, { x: 390, label: "Placements" }, { x: 684, label: "Native paywalls" }, { x: 960, label: "Practice" }],
    notes: ["The new onboarding experience is prepared at 15% Current / 85% No mascot. Enrollment remains off until the treatment is complete; the current IAM / Copy experiment is reported separately.", "Each Yearly/Weekly design receives 25%; yr_49, yr_59 and yr_34 share the remaining 50% equally (~17% each). Displayed percentages are rounded; the actual allocation totals 100%. The split applies within each language, independently of onboarding experience.", ...map.notes],
  };
}

function pokyFlow(map: AppExperimentMapDefinition, selectedLanguage?: string): ExperimentFlow {
  const [plan, planDesign, offer, engine, english, localized, recovery] = map.tests;
  const nodes: ExperimentFlowNode[] = [
    { id: "start", x: 36, y: 330, width: 0, label: "Onboarding", kind: "start", tone: "blue" },
    { id: "language", x: 618, y: 330, width: 144, label: "Paywall language", detail: "English is the fallback", tone: "neutral",
      statsTarget: { experimentId: offer.id } },
    { id: "cancel", x: 1560, y: 368, width: 160, label: "Native purchase cancelled", detail: "Current arm only", tone: "neutral",
      statsTarget: { experimentId: recovery.id } },
    { id: "superwall-recovery", x: 1780, y: 76, width: 164, label: "Superwall recovery", detail: "Current arm only", tone: "orange",
      statsTarget: { experimentId: engine.id } },
  ];
  const edges: ExperimentFlowEdge[] = [];
  plan.branches.forEach((intro, introIndex) => {
    const introId = `intro-${intro.id}`;
    const isAnimated = intro.id === "animated_plan";
    const variants = isAnimated ? ["animated_plan_a", "animated_plan_b"] : ["no_intro_plan_a", "no_intro_plan_b"];
    nodes.push({ id: introId, x: 160, y: introIndex === 0 ? 190 : 470, width: 154,
      label: intro.label, tone: "blue", cohortMetric: { experiment: planDesign.id, variants } });
    edges.push({ from: "start", to: introId, label: `${intro.percent}%` });
    planDesign.branches.forEach((design, designIndex) => {
      const id = isAnimated
        ? `animated_plan_${design.id === "plan_a" ? "a" : "b"}`
        : `no_intro_${design.id}`;
      const childId = `plan-${id}`;
      const y = introIndex === 0 ? 120 + designIndex * 130 : 410 + designIndex * 130;
      nodes.push({ id: childId, x: 398, y, width: 180,
        label: `${isAnimated ? "Intro" : "No intro"} + ${design.id === "plan_a" ? "Plan A" : "Plan B"}`,
        tone: "blue", cohortMetric: { experiment: planDesign.id, variants: [id] } });
      edges.push({ from: introId, to: childId, label: `${design.percent}%` }, { from: childId, to: "language" });
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
  offer.branches.forEach((branch, index) => {
    nodes.push({ id: `offer-${branch.id}`, x: 814, y: index === 0 ? 368 : 76, width: 174,
      label: branch.label, tone: "orange", experimentId: offer.id, variantId: branch.id });
    edges.push({ from: "language", to: `offer-${branch.id}`, label: `${branch.percent}%` });
  });
  engine.branches.forEach((branch, index) => {
    nodes.push({ id: branch.id, x: 1054, y: index === 0 ? 208 : 448, width: 160,
      label: branch.label, tone: "orange", experimentId: engine.id, variantId: branch.id });
    edges.push({ from: "offer-current", to: branch.id, label: `${branch.percent}%` });
  });
  edges.push({ from: "superwall", to: "superwall-recovery", conditional: true });
  const firstOfferY = 448 - (visibleOffers.length - 1) * 50;
  visibleOffers.forEach((offer, index) => {
    nodes.push({
      id: offer.id, x: 1294, y: firstOfferY + index * 100, width: 176, label: offer.label, detail: offer.language, tone: "orange",
      paywallMetric: {
        experiment: `poky_native_main_v1_${offer.languageCode}`,
        variant: offer.metricVariant,
        language: offer.languageCode,
      },
    });
    edges.push({ from: "native", to: offer.id, label: `${offer.percent}%` }, { from: offer.id, to: "cancel", conditional: true });
  });
  recovery.branches.forEach((branch, index) => {
    nodes.push({ id: branch.id, x: 1780, y: 308 + index * 120, width: 164, label: branch.label,
      tone: "orange",
      experimentId: recovery.id, variantId: branch.id });
    edges.push({ from: "cancel", to: branch.id, label: `${branch.percent}%` });
  });
  return {
    width: 1970, height: 700, nodes, edges,
    stages: [
      { x: 160, label: "Plan intro" }, { x: 398, label: "Plan A/B" },
      { x: 618, label: "Audience" }, { x: 814, label: "Offer" }, { x: 1054, label: "Current engine" },
      { x: 1294, label: "Current native paywalls" }, { x: 1560, label: "Current recovery trigger" }, { x: 1780, label: "Recovery" },
    ],
    notes: map.notes,
  };
}
