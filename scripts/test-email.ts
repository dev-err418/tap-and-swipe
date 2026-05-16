import { config as loadEnv } from "dotenv";

import { sendPlunkEmail } from "@/lib/plunk-email";

loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

async function main() {
  const apiUrl = process.env.APPSPRINT_PLUNK_API_URL ?? process.env.PLUNK_API_URL;
  const apiKey = process.env.APPSPRINT_PLUNK_API_KEY;

  const data = await sendPlunkEmail({
    from: { name: "Arthur from AppSprint ASO", email: "arthur@appsprint.app" },
    to: "arthur.spalanzani@gmail.com",
    subject: "Your license key is ready — let's get you more downloads",
    template:
      process.env.APPSPRINT_PLUNK_ASO_LICENSE_TEMPLATE_ID ||
      "onboarding-email",
    data: {
      LICENCE_KEY: {
        value: "ASO-TEST-ABCD-1234-EFGH",
        persistent: false,
      },
    },
  }, { apiUrl, apiKey });

  console.log("Sent!", data);
}

main();
