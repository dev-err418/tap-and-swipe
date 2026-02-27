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
// Scoring (Q8 = investment readiness)
// ---------------------------------------------------------------------------

export function scoreTemperature(answers: Record<string, number>): Temperature {
  const q8 = answers["8"];
  if (q8 === 0) return "HOT";
  if (q8 === 1) return "WARM";
  return "COLD";
}

// ---------------------------------------------------------------------------
// Mirroring – pick 1-2 relevant facts from answers
// ---------------------------------------------------------------------------

const Q1_LABELS: Record<number, string> = {
  0: "you're a salaried dev building on the side",
  1: "you're already indie",
  2: "you have a business and want to add a mobile app",
  3: "you have an app idea and you're starting from scratch",
};

const Q2_LABELS: Record<number, string> = {
  0: "you've already shipped apps",
  1: "you have an app in development",
};

const Q3_LABELS: Record<number, string> = {
  0: "you're already generating over $500/mo",
  1: "you have some revenue coming in",
};

const Q5_LABELS: Record<number, string> = {
  0: "you're going full-time on this",
  1: "you can put in 15-30h/week",
};

const Q7_LABELS: Record<number, string> = {
  0: "your main gap is structure and guidance",
  3: "you've already tried and it didn't work out",
};

function buildMirror(
  answers: Record<string, number>,
  maxFacts: number,
): string {
  const facts: string[] = [];

  // Q1 always first
  const q1 = Q1_LABELS[answers["1"]];
  if (q1) facts.push(q1);

  // Best secondary signal: Q3 > Q5 > Q7 > Q2
  const secondary = [
    Q3_LABELS[answers["3"]],
    Q5_LABELS[answers["5"]],
    Q7_LABELS[answers["7"]],
    Q2_LABELS[answers["2"]],
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
// Reframe one-liners (WARM leads, keyed on Q7)
// ---------------------------------------------------------------------------

const REFRAMES: Record<number, string> = {
  0: "There's a lot of noise out there, I get it.",
  1: "Structure is exactly what makes the difference.",
  2: "The technical stuff is the easy part once you have the right system.",
  3: "Time is always tight, the question is whether you're spending it on the right things.",
  4: "The fact that you tried already puts you ahead of most people.",
};

function getReframe(answers: Record<string, number>): string {
  return REFRAMES[answers["7"]] ?? "Sounds like you're at a turning point.";
}

// ---------------------------------------------------------------------------
// Message templates
// ---------------------------------------------------------------------------

function hasApp(answers: Record<string, number>): boolean {
  return answers["2"] === 0 || answers["2"] === 1;
}

function bookedMessage(
  firstName: string,
  mirror: string,
  appOwner: boolean,
): string {
  const appLine = appOwner
    ? "Send me a link or screenshots of your app before the call so I can review everything and give you real feedback."
    : "Looking forward to chatting and figuring out the best plan for you.";

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
    : `Book a call here and let's figure out the best path for you: ${BOOKING_LINK}`;

  return `Hey ${firstName}

Just read your answers. ${mirror}. Solid profile.

${appLine}

I'll review everything before we talk so I can give you real feedback. We'll also go over the training to see if it's a fit.

Talk soon!`;
}

function warmMessage(
  firstName: string,
  mirror: string,
  reframe: string,
): string {
  return `Hey ${firstName}

Just read your answers. ${mirror}. ${reframe}

Before I send you anything though, are you actually ready to invest in solving this, or just looking around?`;
}

function coldMessage(firstName: string, mirror: string): string {
  return `Hey ${firstName}

Just read your answers. ${mirror}.

Real talk though: the training is a serious investment. Is that something you're actually ready for right now?`;
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
