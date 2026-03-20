import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLicenseKeyEmail(
  to: string,
  licenseKey: string,
  source: "aso" | "community" = "aso"
): Promise<void> {
  const isComm = source === "community";
  try {
    await resend.emails.send({
      from: isComm
        ? "Arthur from App Sprint <arthur@tap-and-swipe.com>"
        : "Arthur from App Sprint ASO <arthur@tap-and-swipe.com>",
      to,
      subject: isComm
        ? "Your free ASO Pro license is ready!"
        : "Your license key is ready! Let's get you more downloads :)",
      template: {
        id: isComm ? "community-email" : "onboarding-email",
        variables: {
          LICENCE_KEY: licenseKey,
        },
      },
    } as any);
  } catch (err) {
    console.error(`[${isComm ? "Community" : "ASO"}] Failed to send license email:`, err);
  }
}
