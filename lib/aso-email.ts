import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLicenseKeyEmail(
  to: string,
  licenseKey: string,
  source: "aso" | "community" = "aso",
  manageUrl?: string
): Promise<void> {
  const isComm = source === "community";
  try {
    const variables: Record<string, string> = {
      LICENCE_KEY: licenseKey,
    };
    if (manageUrl) {
      variables.MANAGE_URL = manageUrl;
    }

    await resend.emails.send({
      from: isComm
        ? "Arthur from AppSprint <arthur@appsprint.app>"
        : "Arthur from AppSprint ASO <arthur@appsprint.app>",
      to,
      subject: isComm
        ? "Your free ASO Pro license is ready!"
        : "Your license key is ready! Let's get you more downloads :)",
      template: {
        id: isComm ? "community-email" : "onboarding-email",
        variables,
      },
    } as any);
  } catch (err) {
    console.error(`[${isComm ? "Community" : "ASO"}] Failed to send license email:`, err);
  }
}
