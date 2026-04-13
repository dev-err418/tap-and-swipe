import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  const { data, error } = await resend.emails.send({
    from: "Arthur from AppSprint ASO <arthur@appsprint.app>",
    to: "arthur.spalanzani@gmail.com",
    subject: "Your license key is ready — let's get you more downloads",
    template: {
      id: "onboarding-email",
      variables: {
        LICENCE_KEY: "ASO-TEST-ABCD-1234-EFGH",
      },
    },
  } as any);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Sent!", data);
  }
}

main();
