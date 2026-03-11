import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function sendLicenseKeyEmail(
  to: string,
  licenseKey: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: "Arthur from App Sprint ASO <noreply@tapandswipe.app>",
      to,
      subject: "Your license key is ready — let's get you more downloads",
      html: `
        <div style="background-color: #2a2725; width: 100%; padding: 40px 0;">
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px;">
            <p style="color: #f1ebe2; font-size: 17px; line-height: 1.7; margin: 0 0 4px 0;">
              Hey! Arthur here.
            </p>
            <p style="color: #c9c4bc; font-size: 17px; line-height: 1.7; margin: 0 0 28px 0;">
              Thanks for joining App Sprint ASO — you just made the best investment for your app's growth. Here's your license key:
            </p>
            <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 28px;">
              <code style="font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #f4cf8f;">
                ${licenseKey}
              </code>
            </div>
            <p style="color: #f1ebe2; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
              <strong>To activate:</strong> Open App Sprint ASO on your Mac → Paste this key when prompted. That's it.
            </p>
            <p style="color: #c9c4bc; font-size: 15px; line-height: 1.7; margin: 0 0 12px 0;">
              Here's what I'd do first:
            </p>
            <ol style="color: #c9c4bc; font-size: 15px; line-height: 2.2; padding-left: 20px; margin: 0 0 28px 0;">
              <li>Search for your app and pin it to your dashboard</li>
              <li>Check what keywords your top competitor ranks for</li>
              <li>Run a keyword analysis — the difficulty + popularity scores will show you exactly where the opportunity is</li>
            </ol>
            <p style="color: #c9c4bc; font-size: 15px; line-height: 1.7; margin: 0 0 8px 0;">
              If you have any questions or feedback, just reply to this email. I read everything.
            </p>
            <p style="color: #f1ebe2; font-size: 15px; line-height: 1.7; margin: 0;">
              Let's get you ranking,<br/>
              <strong>Arthur</strong>
            </p>
            <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.08);">
              <p style="color: #c9c4bc; font-size: 12px; line-height: 1.5; margin: 0; opacity: 0.5;">
                This key is bound to one Mac. Need to transfer it? Just reply here.<br/>
                <a href="${APP_URL}/aso" style="color: #f4cf8f;">App Sprint ASO</a> by Tap & Swipe
              </p>
            </div>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("[ASO] Failed to send license email:", err);
  }
}
