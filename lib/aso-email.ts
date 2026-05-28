import { sendPlunkEmail } from "@/lib/plunk-email";

export type LicenseEmailSource = "aso" | "community" | "community-starter";

const WHOP_MEMBERSHIPS_URL = "https://whop.com/@me/settings/memberships/";

function getAppSprintPlunkConfig() {
  const apiUrl = process.env.APPSPRINT_PLUNK_API_URL ?? process.env.PLUNK_API_URL;
  const apiKey = process.env.APPSPRINT_PLUNK_API_KEY ?? process.env.PLUNK_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error("APPSPRINT_PLUNK_API_URL and APPSPRINT_PLUNK_API_KEY must be set");
  }

  return { apiUrl, apiKey };
}

const SOURCE_CONFIG: Record<
  LicenseEmailSource,
  {
    from: { name: string; email: string };
    subject: string;
    templateId: string;
    label: string;
  }
> = {
  aso: {
    from: { name: "Arthur from AppSprint ASO", email: "arthur@appsprint.app" },
    subject: "Your license key is ready! Let's get you more downloads :)",
    templateId:
      process.env.APPSPRINT_PLUNK_ASO_LICENSE_TEMPLATE_ID ||
      process.env.PLUNK_ASO_LICENSE_TEMPLATE_ID ||
      "onboarding-email",
    label: "ASO",
  },
  community: {
    from: { name: "Arthur from AppSprint", email: "arthur@appsprint.app" },
    subject: "Your free ASO Pro license is ready!",
    templateId:
      process.env.APPSPRINT_PLUNK_COMMUNITY_PRO_TEMPLATE_ID ||
      process.env.PLUNK_APPSPRINT_FIRST_EVENT_TEMPLATE_ID ||
      "community-email",
    label: "Community",
  },
  "community-starter": {
    from: { name: "Arthur from AppSprint", email: "arthur@appsprint.app" },
    subject: "Your free ASO Solo license is ready!",
    templateId:
      process.env.APPSPRINT_PLUNK_COMMUNITY_STARTER_TEMPLATE_ID ||
      process.env.PLUNK_APPSPRINT_FIRST_EVENT_TEMPLATE_ID ||
      "community-email-starter",
    label: "Community-Starter",
  },
};

export async function sendLicenseKeyEmail(
  to: string,
  licenseKey: string,
  source: LicenseEmailSource = "aso",
  manageUrl?: string
): Promise<boolean> {
  const config = SOURCE_CONFIG[source];
  try {
    const resolvedManageUrl = manageUrl ?? WHOP_MEMBERSHIPS_URL;
    const variables: Record<string, string> = {
      LICENCE_KEY: licenseKey,
    };
    if (resolvedManageUrl) {
      variables.MANAGE_URL = resolvedManageUrl;
    }

    await sendPlunkEmail(
      {
        from: config.from,
        to,
        subject: config.subject,
        template: config.templateId,
        data: Object.fromEntries(
          Object.entries(variables).map(([key, value]) => [
            key,
            { value, persistent: false },
          ]),
        ),
      },
      getAppSprintPlunkConfig(),
    );
    return true;
  } catch (err) {
    console.error(`[${config.label}] Failed to send license email:`, err);
    return false;
  }
}
