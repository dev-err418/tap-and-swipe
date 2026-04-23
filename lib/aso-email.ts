import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export type LicenseEmailSource = "aso" | "community" | "community-starter";

const SOURCE_CONFIG: Record<
  LicenseEmailSource,
  { from: string; subject: string; templateId: string; label: string }
> = {
  aso: {
    from: "Arthur from AppSprint ASO <arthur@appsprint.app>",
    subject: "Your license key is ready! Let's get you more downloads :)",
    templateId: "onboarding-email",
    label: "ASO",
  },
  community: {
    from: "Arthur from AppSprint <arthur@appsprint.app>",
    subject: "Your free ASO Pro license is ready!",
    templateId: "community-email",
    label: "Community",
  },
  "community-starter": {
    from: "Arthur from AppSprint <arthur@appsprint.app>",
    subject: "Your free ASO Solo license is ready!",
    templateId: "community-email-starter",
    label: "Community-Starter",
  },
};

export async function sendLicenseKeyEmail(
  to: string,
  licenseKey: string,
  source: LicenseEmailSource = "aso",
  manageUrl?: string
): Promise<void> {
  const config = SOURCE_CONFIG[source];
  try {
    const variables: Record<string, string> = {
      LICENCE_KEY: licenseKey,
    };
    if (manageUrl) {
      variables.MANAGE_URL = manageUrl;
    }

    await resend.emails.send({
      from: config.from,
      to,
      subject: config.subject,
      template: {
        id: config.templateId,
        variables,
      },
    } as any);
  } catch (err) {
    console.error(`[${config.label}] Failed to send license email:`, err);
  }
}
