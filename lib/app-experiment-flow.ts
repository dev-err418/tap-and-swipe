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
  const [onboarding, access, price, benefits] = map.tests;
  const nodes: ExperimentFlowNode[] = [
    { id: "start", x: 36, y: 212, width: 0, label: "New install", kind: "start", tone: "blue" },
  ];
  const edges: ExperimentFlowEdge[] = [];
  onboarding.branches.forEach((branch, index) => {
    nodes.push({ id: branch.id, x: 168, y: 76 + index * 136, width: 170,
      label: branch.label, tone: "blue", experimentId: onboarding.id, variantId: branch.id });
    edges.push({ from: "start", to: branch.id, label: `${branch.percent}%` });
  });
  access.branches.forEach((branch, index) => {
    const id = `access-${branch.id}`;
    nodes.push({ id, x: 430, y: 76 + index * 136, width: 170,
      label: branch.label, tone: "orange", experimentId: access.id, variantId: branch.id });
    onboarding.branches.filter((parent) => parent.id !== "scroll_the_bible").forEach((parent) => edges.push({ from: parent.id, to: id, label: "50%" }));
  });
  benefits.branches.forEach((branch, index) => {
    const id = `benefits-${branch.id}`;
    nodes.push({ id, x: 430, y: 348 + index * 136, width: 190,
      label: branch.label, detail: "Next app build · after Premium preview", tone: "orange",
      experimentId: benefits.id, variantId: branch.id });
    edges.push({ from: "scroll_the_bible", to: id, label: `${branch.percent}%` });
    edges.push({ from: id, to: "scroll-trial" });
  });
  nodes.push({ id: "scroll-trial", x: 692, y: 416, width: 190,
    label: "Bible Scroll trial", detail: "Dismissible · yearly + weekly", tone: "orange" });
  price.branches.forEach((branch, index) => {
    const id = `price-${index}`;
    nodes.push({ id, x: 956, y: 80 + index * 136, width: 190,
      label: branch.label, tone: "orange", experimentId: price.id, variantId: branch.id.split(".").at(-1) });
    access.branches.forEach((parent) => edges.push({ from: `access-${parent.id}`, to: id, label: `${branch.percent}%` }));
    edges.push({ from: "scroll-trial", to: id });
  });
  return {
    width: 1192, height: 560, nodes, edges,
    stages: [{ x: 168, label: "Onboarding flow" }, { x: 430, label: "Onboarding paywall" },
      { x: 692, label: "Reminder & paywall" }, { x: 956, label: "Yearly price" }],
    notes: map.notes,
  };
}

function glowFlow(map: AppExperimentMapDefinition): ExperimentFlow {
  const [onboarding, paywallFlow, prices] = map.tests;
  const nodes: ExperimentFlowNode[] = [
    { id: "start", x: 36, y: 168, width: 0, label: "Onboarding", kind: "start", tone: "blue" },
    { id: "home", x: 1010, y: 168, width: 140, label: "Practice", detail: "Everyone", tone: "neutral" },
  ];
  const edges: ExperimentFlowEdge[] = [];
  onboarding.branches.forEach((branch, index) => {
    nodes.push({ id: branch.id, x: 140, y: 112 + index * 112, width: 160,
      label: branch.label, detail: "Next app build", tone: "blue", experimentId: onboarding.id, variantId: branch.id });
    edges.push({ from: "start", to: branch.id, label: `${branch.percent}%` });
  });
  paywallFlow.branches.forEach((branch, index) => {
    nodes.push({ id: branch.id, x: 414, y: 112 + index * 112, width: 188,
      label: branch.label, detail: "Paywall introduction", tone: "orange", experimentId: paywallFlow.id, variantId: branch.id });
    onboarding.branches.forEach((parent) => edges.push({ from: parent.id, to: branch.id, label: "50%" }));
  });
  prices.branches.forEach((branch, index) => {
    nodes.push({ id: branch.id, x: 730, y: 64 + index * 104, width: 180, label: branch.label, tone: "orange",
      paywallMetric: { experiment: prices.id, variant: branch.id, language: "all" } });
    paywallFlow.branches.forEach((parent) => edges.push({ from: parent.id, to: branch.id, label: formatPaywallAllocation(branch.percent) }));
    edges.push({ from: branch.id, to: "home" });
  });
  return { width: 1186, height: 320, nodes, edges,
    stages: [{ x: 140, label: "Onboarding" }, { x: 414, label: "Paywall flow" }, { x: 730, label: "Yearly price" }, { x: 1010, label: "Practice" }],
    notes: ["The onboarding journey, paywall flow and yearly price are independent saved assignments. The reminder flow is tested in both IAM and manifest-audio.", "The paywall flow comparison enrolls everyone reaching the introduction; the price test also covers other app placements. Their user counts and APPU denominators differ.", ...map.notes] };
}

function pokyFlow(map: AppExperimentMapDefinition, selectedLanguage?: string): ExperimentFlow {
  const [plan, planDesign, offer, english, localized, recovery] = map.tests;
  const nodes: ExperimentFlowNode[] = [
    { id: "start", x: 36, y: 330, width: 0, label: "Onboarding", kind: "start", tone: "blue" },
    { id: "language", x: 618, y: 330, width: 144, label: "Paywall language", detail: "English is the fallback", tone: "neutral",
      statsTarget: { experimentId: offer.id } },
    { id: "cancel", x: 1320, y: 368, width: 160, label: "Native purchase cancelled", detail: "Current arm only", tone: "neutral",
      statsTarget: { experimentId: recovery.id } },
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
    nodes.push({ id: `offer-${branch.id}`, x: 814, y: index === 0 ? 480 : 76 + (index - 1) * 130, width: 174,
      label: branch.label, tone: "orange", experimentId: offer.id, variantId: branch.id });
    edges.push({ from: "language", to: `offer-${branch.id}`, label: `${branch.percent}%` });
  });
  const firstOfferY = 448 - (visibleOffers.length - 1) * 50;
  visibleOffers.forEach((offer, index) => {
    nodes.push({
      id: offer.id, x: 1054, y: firstOfferY + index * 100, width: 176, label: offer.label, detail: offer.language, tone: "orange",
      paywallMetric: {
        experiment: `poky_native_main_v1_${offer.languageCode}`,
        variant: offer.metricVariant,
        language: offer.languageCode,
      },
    });
    edges.push({ from: "offer-current", to: offer.id, label: `${offer.percent}%` }, { from: offer.id, to: "cancel", conditional: true });
  });
  recovery.branches.forEach((branch, index) => {
    nodes.push({ id: branch.id, x: 1540, y: 368 + index * 120, width: 164, label: branch.label,
      tone: "orange",
      experimentId: recovery.id, variantId: branch.id });
    edges.push({ from: "cancel", to: branch.id, label: `${branch.percent}%` });
  });
  return {
    width: 1730, height: 700, nodes, edges,
    stages: [
      { x: 160, label: "Plan intro" }, { x: 398, label: "Plan A/B" },
      { x: 618, label: "Audience" }, { x: 814, label: "Offer" },
      { x: 1054, label: "Current native paywalls" }, { x: 1320, label: "Current recovery trigger" }, { x: 1540, label: "Recovery" },
    ],
    notes: map.notes,
  };
}
