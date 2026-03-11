import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendLicenseKeyEmail(
  to: string,
  licenseKey: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: "Arthur from App Sprint ASO <noreply@tapandswipe.app>",
      to,
      subject: "Your license key is ready — let's get you more downloads",
      template: {
        id: "onboarding-email",
        variables: {
          LICENCE_KEY: licenseKey,
        },
      },
    } as any);
  } catch (err) {
    console.error("[ASO] Failed to send license email:", err);
  }
}
