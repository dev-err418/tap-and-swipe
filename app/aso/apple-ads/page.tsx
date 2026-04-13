import Image from "next/image";

export const metadata = {
  title: "Apple Ads Integration",
  description: "Connect your Apple Search Ads API to AppSprint ASO.",
};

type Step = {
  title: string;
  description: string;
  image?: string;
  note?: string;
};

const steps: Step[] = [
  {
    title: "Create a new Apple Account",
    description: "create-account",
  },
  {
    title: "Click your account name",
    description:
      "In Apple Search Ads Advanced, click your account name in the top right corner.",
    image: "/aso/apple-ads/step-1.webp",
  },
  {
    title: "Go to Settings",
    description:
      'Click "Settings" in the dropdown menu.',
    image: "/aso/apple-ads/step-2.webp",
  },
  {
    title: "Open User Management",
    description:
      'Click the "User Management" tab.',
    image: "/aso/apple-ads/step-3.webp",
  },
  {
    title: "Click Invite Users",
    description:
      'Click the "Invite Users" button.',
    image: "/aso/apple-ads/step-4.webp",
  },
  {
    title: 'Invite the new account as "API Account Manager"',
    description:
      'Enter the email of the Apple Account you just created, select the "API Account Manager" role, and click Send Invite.',
    image: "/aso/apple-ads/step-5.webp",
    note: "The invitation email can take up to 30 minutes to arrive.",
  },
  {
    title: "Sign out of your main account",
    description:
      'Before checking the invite email, sign out of your main Apple Search Ads account. Click your name in the top right and click "Sign Out". This ensures you accept the invite with the correct account.',
  },
  {
    title: "Accept the invitation",
    description:
      "Open the invitation email on the newly created account and click the accept link. Log in with the new Apple Account when prompted.",
    image: "/aso/apple-ads/step-6.webp",
  },
  {
    title: "Enter the activation code and join",
    description:
      "You'll be redirected to a page with an activation code (also sent in the email). Enter it and click Join.",
    image: "/aso/apple-ads/step-7.webp",
  },
  {
    title: "Go to Settings again",
    description:
      'Now logged in as the invited account, click your account name in the top right and go to Settings — just like in steps 2 and 3.',
    image: "/aso/apple-ads/step-1.webp",
  },
  {
    title: "You're on the API page",
    description:
      'You\'ll land on the API settings with a Public Key field. In AppSprint ASO, click "Generate Key Pair" — this creates a private key (stored in the app) and a public key. Copy the public key.',
    image: "/aso/apple-ads/step-8.webp",
  },
  {
    title: "Paste the public key and generate the API client",
    description:
      'Paste the public key into the field, then click "Generate API Client".',
    image: "/aso/apple-ads/step-9.webp",
  },
  {
    title: "Copy your credentials into AppSprint ASO",
    description:
      "Apple will display your clientId, teamId, and keyId. Copy all three values and paste them into the corresponding fields in AppSprint ASO. You're all set!",
    image: "/aso/apple-ads/step-10.webp",
  },
];

export default function AppleAdsPage() {
  return (
    <main className="min-h-screen bg-[#2a2725] px-4 py-16 text-[#f1ebe2] selection:bg-[#f4cf8f]/30">
      <article className="mx-auto max-w-2xl">
        <h1 className="mt-8 font-serif text-4xl font-bold tracking-tight sm:text-5xl text-[#f1ebe2]">
          Apple Ads
        </h1>
        <p className="mt-2 text-[#c9c4bc]">Integration Setup</p>

        <div className="mt-10 space-y-8 text-[#c9c4bc] leading-relaxed">
          <p>
            Connect your Apple Search Ads API so AppSprint ASO can pull your
            campaign data and keyword analytics. This requires creating a
            dedicated Apple Account for API access, then linking it to your
            organization.
          </p>

          {/* Steps */}
          <div className="space-y-12">
            {steps.map((step, i) => (
              <section key={i}>
                <h2 className="text-xl font-semibold text-[#f1ebe2]">
                  {i + 1}. {step.title}
                </h2>
                <p className="mt-2">
                  {step.description === "create-account" ? (
                    <>
                      Go to{" "}
                      <a
                        href="https://account.apple.com/account"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#f4cf8f] underline hover:text-[#f4cf8f]/80"
                      >
                        account.apple.com/account
                      </a>{" "}
                      and create a new Apple Account. This account will be
                      invited to your Apple Search Ads organization and used for
                      API access. You won&apos;t need to use it again after
                      setup.
                    </>
                  ) : (
                    step.description
                  )}
                </p>
                {step.note && (
                  <p className="mt-2 text-sm text-[#f4cf8f]/80">
                    {step.note}
                  </p>
                )}
                {step.image && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                    <Image
                      src={step.image}
                      alt={`Step ${i + 1}: ${step.title}`}
                      width={1200}
                      height={700}
                      className="w-full"
                    />
                  </div>
                )}
              </section>
            ))}
          </div>

          <p className="pt-4 text-sm text-[#c9c4bc]">
            That&apos;s it! Your Apple Search Ads data will now sync with AppSprint ASO.
          </p>
        </div>
      </article>
    </main>
  );
}
