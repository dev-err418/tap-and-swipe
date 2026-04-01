const BOOKING_LINK =
  "https://cal.com/arthur-builds-stuff/app-sprint-application";

type Temperature = "HOT" | "WARM" | "COLD";

interface GenerateLeadMessageInput {
  firstName: string;
  countryCode: string;
  phone?: string;
  answers: Record<string, number>;
  booked: boolean;
}

interface GenerateLeadMessageResult {
  temperature: Temperature;
  message: string;
  whatsappUrl?: string;
}

function getProfileType(answers: Record<string, number>): "scale" | "build" | "disqualified" {
  const q1 = answers.q1;
  const q2 = answers.q2;
  const q3 = answers.q3;

  if (q1 !== 0) return "disqualified";
  if (q2 === 0) return "scale";
  if (q2 === 2) return "build";
  if (q3 === 1) return "build";
  if (q3 === 0) return "scale";
  return "disqualified";
}

export function scoreTemperature(answers: Record<string, number>): Temperature {
  const profileType = getProfileType(answers);
  if (profileType === "scale") return "HOT";
  if (profileType === "build") return "WARM";
  return "COLD";
}

const Q1_LABELS: Record<number, string> = {
  0: "you are a founder or small team with a real B2C business",
  1: "you are a developer, freelancer, or agency",
  2: "you are still exploring",
};

const Q2_LABELS: Record<number, string> = {
  0: "the app is already live and doing between €3k and €50k MRR",
  1: "the app is live but still below €3k MRR",
  2: "the business is real but the app is not live yet",
  3: "there is no live app with traction yet",
};

const Q3_LABELS: Record<number, string> = {
  0: "you are looking for help scaling the app",
  1: "you are looking for help building or improving the app",
};

const Q4_LABELS: Record<number, string> = {
  0: "you do not have enough channel-level revenue visibility",
  1: "paid acquisition still feels blind",
  2: "attribution and SKAN are too noisy to trust",
  3: "you need the full growth system set up properly",
};

function buildMirror(
  answers: Record<string, number>,
  maxFacts: number,
): string {
  const facts = [Q1_LABELS[answers.q1], Q2_LABELS[answers.q2], Q3_LABELS[answers.q3], Q4_LABELS[answers.q4]]
    .filter(Boolean)
    .slice(0, maxFacts);

  if (facts.length === 0) return "Interesting profile";
  facts[0] = facts[0].charAt(0).toUpperCase() + facts[0].slice(1);
  if (facts.length === 1) return facts[0];
  return facts.slice(0, -1).join(", and ") + ", and " + facts[facts.length - 1];
}

function bookedMessage(
  firstName: string,
  mirror: string,
  profileType: "scale" | "build" | "disqualified",
): string {
  const line =
    profileType === "scale"
      ? "Send me your app link plus any current channel data before the call so I can review it properly."
      : "Send me your app, mockups, or current build status before the call so I can prepare useful feedback.";

  return `Hey ${firstName}

Just saw you booked a call. ${mirror}.

${line}

Talk soon!`;
}

function hotMessage(firstName: string, mirror: string): string {
  return `Hey ${firstName}

Just read your answers. ${mirror}.

You look like a real fit for the scaling conversation. Book your call here: ${BOOKING_LINK}

If you send me the app link and your current acquisition setup before the call, I will review it in advance.

Talk soon!`;
}

function warmMessage(firstName: string, mirror: string): string {
  return `Hey ${firstName}

Just read your answers. ${mirror}.

You look closer to the build path than the scaling path right now. If you want to move forward, book here: ${BOOKING_LINK}

Happy to help you figure out the product and execution side.
`;
}

function coldMessage(firstName: string, mirror: string): string {
  return `Hey ${firstName}

Just read your answers. ${mirror}.

This offer is mainly for live B2C apps already showing traction. When that changes, you can book here: ${BOOKING_LINK}`;
}

function buildWhatsAppUrl(
  countryCode: string,
  phone: string,
  message: string,
): string {
  const cleanPhone = (countryCode + phone).replace(/[^\d]/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

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

export function generateLeadMessage(
  input: GenerateLeadMessageInput,
): GenerateLeadMessageResult {
  const { firstName, countryCode, phone, answers, booked } = input;
  const temperature = scoreTemperature(answers);
  const profileType = getProfileType(answers);
  const mirror = buildMirror(answers, profileType === "scale" ? 3 : 2);

  let message: string;

  if (booked) {
    message = bookedMessage(firstName, mirror, profileType);
  } else if (temperature === "HOT") {
    message = hotMessage(firstName, mirror);
  } else if (temperature === "WARM") {
    message = warmMessage(firstName, mirror);
  } else {
    message = coldMessage(firstName, mirror);
  }

  const whatsappUrl = phone
    ? buildWhatsAppUrl(countryCode, phone, message)
    : undefined;
  return { temperature, message, whatsappUrl };
}
