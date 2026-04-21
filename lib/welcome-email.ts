import nodemailer from "nodemailer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://tap-and-swipe.com";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT || 587),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function sendWelcomeEmail(
  to: string,
  activationToken: string
): Promise<void> {
  const activateUrl = `${APP_URL}/activate?token=${activationToken}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "App Sprint <noreply@tap-and-swipe.com>",
    to,
    subject: "Welcome to AppSprint! Activate your account",
    text: `Welcome to AppSprint!

Click the link below to activate your account and access your course:

${activateUrl}

If you didn't purchase AppSprint, you can ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #000; margin-bottom: 8px;">Welcome to AppSprint!</h1>
        <p style="font-size: 16px; color: #666; line-height: 1.6; margin-bottom: 32px;">
          Your payment was successful. Click the button below to set up your account and start the course.
        </p>
        <a href="${activateUrl}" style="display: inline-block; background: #000; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Activate your account
        </a>
        <p style="font-size: 13px; color: #999; margin-top: 32px; line-height: 1.5;">
          Or copy this link: ${activateUrl}
        </p>
      </div>
    `,
  });
}

export async function sendWelcomeBackEmail(
  to: string
): Promise<void> {
  const loginUrl = `${APP_URL}/login`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "App Sprint <noreply@tap-and-swipe.com>",
    to,
    subject: "Welcome back to AppSprint!",
    text: `Welcome back to AppSprint!

Your subscription has been reactivated. Sign in to continue your course:

${loginUrl}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #000; margin-bottom: 8px;">Welcome back!</h1>
        <p style="font-size: 16px; color: #666; line-height: 1.6; margin-bottom: 32px;">
          Your subscription has been reactivated. Sign in to continue your course.
        </p>
        <a href="${loginUrl}" style="display: inline-block; background: #000; color: #fff; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Sign in
        </a>
      </div>
    `,
  });
}
