import Image from "next/image";

export const metadata = {
  title: "App Store Connect Integration",
  description:
    "Connect your App Store Connect API key to AppSprint ASO.",
};

const steps = [
  {
    title: "Go to Users and Access",
    description:
      'Sign in to App Store Connect, then click "Users and Access" in the top navigation bar.',
    image: "/aso/app-store-connect/step-1.webp",
  },
  {
    title: "Open Integrations",
    description:
      'Click the "Integrations" tab, then select "App Store Connect API" in the left sidebar under Keys.',
    image: "/aso/app-store-connect/step-2.webp",
  },
  {
    title: "Generate a new API key",
    description:
      'Click the "+" button next to "Active" to create a new key.',
    image: "/aso/app-store-connect/step-3.webp",
  },
  {
    title: 'Name it and select "App Manager"',
    description:
      'Enter any name (e.g. "AppSprint ASO") and select the "App Manager" role, then click Generate.',
    image: "/aso/app-store-connect/step-4.webp",
  },
  {
    title: "Copy your Issuer ID",
    description:
      "The Issuer ID is shown at the top of the page. Click Copy, then paste it into the Issuer ID field in AppSprint ASO.",
    image: "/aso/app-store-connect/step-5.webp",
  },
  {
    title: "Copy your Key ID",
    description:
      "Find your newly created key in the list, copy the Key ID, and paste it into the Key ID field in AppSprint ASO.",
    image: "/aso/app-store-connect/step-6.webp",
  },
  {
    title: "Download the .p8 file",
    description:
      'Click "Download" to save the API key file. You can only download it once, so keep it safe. Select it in the .p8 file field in AppSprint ASO.',
    image: "/aso/app-store-connect/step-7.webp",
  },
];

export default function AppStoreConnectPage() {
  return (
    <main className="min-h-screen bg-[#2a2725] px-4 py-16 text-[#f1ebe2] selection:bg-[#f4cf8f]/30">
      <article className="mx-auto max-w-2xl">
        <h1 className="mt-8 font-serif text-4xl font-bold tracking-tight sm:text-5xl text-[#f1ebe2]">
          App Store Connect
        </h1>
        <p className="mt-2 text-[#c9c4bc]">Integration Setup</p>

        <div className="mt-10 space-y-8 text-[#c9c4bc] leading-relaxed">
          <p>
            Connect your App Store Connect API key so AppSprint ASO can pull
            your app metadata, keywords, and performance data. Follow the steps
            below to generate a key and link it.
          </p>

          {/* Steps */}
          <div className="space-y-12">
            {steps.map((step, i) => (
              <section key={i}>
                <h2 className="text-xl font-semibold text-[#f1ebe2]">
                  {i + 1}. {step.title}
                </h2>
                <p className="mt-2">{step.description}</p>
                <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
                  <Image
                    src={step.image}
                    alt={`Step ${i + 1}: ${step.title}`}
                    width={1200}
                    height={700}
                    className="w-full"
                  />
                </div>
              </section>
            ))}
          </div>

          <p className="pt-4 text-sm text-[#c9c4bc]">
            That&apos;s it! Once all three fields are filled in AppSprint ASO, click Connect and you&apos;re good to go.
          </p>
        </div>
      </article>
    </main>
  );
}
