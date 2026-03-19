const BOOKING_LINK =
  "https://cal.com/arthur-builds-stuff/app-sprint-application";

type Temperature = "HOT" | "WARM" | "COLD";

interface GenerateLeadMessageInput {
  firstName: string;
  countryCode: string;
  phone: string;
  answers: Record<string, number>;
  booked: boolean;
}

interface GenerateLeadMessageResult {
  temperature: Temperature;
  message: string;
  whatsappUrl: string;
}

// ---------------------------------------------------------------------------
// Scoring (Q5 = investment readiness)
// ---------------------------------------------------------------------------

export function scoreTemperature(answers: Record<string, number>): Temperature {
  const q5 = answers["q5"];
  if (q5 === 0) return "HOT";
  if (q5 === 1) return "WARM";
  return "COLD";
}

// ---------------------------------------------------------------------------
// Mirroring – pick 1-2 relevant facts from answers
// ---------------------------------------------------------------------------

const Q1_LABELS: Record<number, string> = {
  0: "you run a local / service-based business",
  1: "you run an e-commerce business",
  2: "you run a SaaS or digital platform",
  3: "you're launching a startup around your app",
  4: "you have a specific business context",
};

const Q3_LABELS: Record<number, string> = {
  0: "you need strategic guidance first",
  1: "you need someone to handle the development",
  2: "you need help with growth and monetization",
  3: "you want a full partner for strategy and development",
};

const Q4_LABELS: Record<number, string> = {
  0: "you already have a dev team but need extra help",
  1: "you don't have a technical team yet",
  2: "you're not satisfied with your current freelancer or agency",
};

const Q2_LABELS: Record<number, string> = {
  2: "you already have an app in development",
  3: "you have a live app that needs work",
};

function buildMirror(
  answers: Record<string, number>,
  maxFacts: number,
): string {
  const facts: string[] = [];

  // Q1 always first
  const q1 = Q1_LABELS[answers["q1"]];
  if (q1) facts.push(q1);

  // Best secondary signal: Q3 > Q4 > Q2
  const secondary = [
    Q3_LABELS[answers["q3"]],
    Q4_LABELS[answers["q4"]],
    Q2_LABELS[answers["q2"]],
  ];

  for (const s of secondary) {
    if (s && facts.length < maxFacts) facts.push(s);
  }

  // Capitalise first fact, join with ", and "
  if (facts.length === 0) return "Interesting profile";
  facts[0] = facts[0].charAt(0).toUpperCase() + facts[0].slice(1);
  if (facts.length === 1) return facts[0];
  return facts.slice(0, -1).join(", ") + ", and " + facts[facts.length - 1];
}

// ---------------------------------------------------------------------------
// Reframe one-liners (WARM leads, keyed on Q3 = primary need)
// ---------------------------------------------------------------------------

const REFRAMES: Record<number, string> = {
  0: "Figuring out the right strategy before building is the smartest move you can make.",
  1: "Finding the right person to build your app is half the battle.",
  2: "Growth is a completely different skill than building — and it's where most apps stall.",
  3: "Having one person who handles both strategy and execution makes everything faster.",
};

function getReframe(answers: Record<string, number>): string {
  return REFRAMES[answers["q3"]] ?? "Sounds like you're at a turning point.";
}

// ---------------------------------------------------------------------------
// Message templates
// ---------------------------------------------------------------------------

function hasApp(answers: Record<string, number>): boolean {
  return answers["q2"] === 2 || answers["q2"] === 3;
}

function bookedMessage(
  firstName: string,
  mirror: string,
  appOwner: boolean,
): string {
  const appLine = appOwner
    ? "Send me a link or screenshots of your app before the call so I can review everything and give you real feedback."
    : "Looking forward to learning more about your project and figuring out the best approach.";

  return `Hey ${firstName}

Just saw you booked a call, nice! I read your answers. ${mirror}.

${appLine}

Talk soon!`;
}

function hotMessage(
  firstName: string,
  mirror: string,
  appOwner: boolean,
): string {
  const appLine = appOwner
    ? `Send me a link or screenshots of your app, and book a call here: ${BOOKING_LINK}`
    : `Book a call here and let's figure out the best approach for your project: ${BOOKING_LINK}`;

  return `Hey ${firstName}

Just read your answers. ${mirror}. Sounds like a solid project.

${appLine}

I'll review everything before we talk so I can give you real, specific feedback on your situation.

Talk soon!`;
}

function warmMessage(
  firstName: string,
  mirror: string,
  reframe: string,
): string {
  return `Hey ${firstName}

Just read your answers. ${mirror}. ${reframe}

Quick question before I send you anything: are you actively looking to move forward on this, or still in research mode?`;
}

function coldMessage(firstName: string, mirror: string): string {
  return `Hey ${firstName}

Just read your answers. ${mirror}.

When you're ready to move forward on your app project, feel free to book a call: ${BOOKING_LINK}

No rush — happy to chat whenever the timing is right.`;
}

// ---------------------------------------------------------------------------
// WhatsApp URL
// ---------------------------------------------------------------------------

function buildWhatsAppUrl(
  countryCode: string,
  phone: string,
  message: string,
): string {
  const cleanPhone = (countryCode + phone).replace(/[^\d]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Follow-up message (24h after "show")
// ---------------------------------------------------------------------------

interface GenerateFollowUpMessageInput {
  firstName: string;
  countryCode: string;
  phone: string;
}

interface GenerateFollowUpMessageResult {
  whatsappUrlFr: string;
  whatsappUrlEn: string;
}

export function generateFollowUpMessage(
  input: GenerateFollowUpMessageInput,
): GenerateFollowUpMessageResult {
  const { firstName, countryCode, phone } = input;

  const messageFr = `Hey ${firstName}, je fais suite à notre appel. T'as eu le temps d'y réfléchir ?`;
  const messageEn = `Hey ${firstName}, just following up after our call. Have you had time to think about it?`;

  return {
    whatsappUrlFr: buildWhatsAppUrl(countryCode, phone, messageFr),
    whatsappUrlEn: buildWhatsAppUrl(countryCode, phone, messageEn),
  };
}

// ---------------------------------------------------------------------------
// Initial outreach message
// ---------------------------------------------------------------------------

export function generateLeadMessage(
  input: GenerateLeadMessageInput,
): GenerateLeadMessageResult {
  const { firstName, countryCode, phone, answers, booked } = input;
  const temperature = scoreTemperature(answers);
  const appOwner = hasApp(answers);

  let message: string;

  if (booked) {
    const mirror = buildMirror(answers, 2);
    message = bookedMessage(firstName, mirror, appOwner);
  } else if (temperature === "HOT") {
    const mirror = buildMirror(answers, 2);
    message = hotMessage(firstName, mirror, appOwner);
  } else if (temperature === "WARM") {
    const mirror = buildMirror(answers, 2);
    const reframe = getReframe(answers);
    message = warmMessage(firstName, mirror, reframe);
  } else {
    const mirror = buildMirror(answers, 1);
    message = coldMessage(firstName, mirror);
  }

  const whatsappUrl = buildWhatsAppUrl(countryCode, phone, message);

  return { temperature, message, whatsappUrl };
}
