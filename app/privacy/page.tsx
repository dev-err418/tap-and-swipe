import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Tap & Swipe — learn how we collect, use, and protect your personal information.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#2a2725] px-4 py-16 text-[#f1ebe2] selection:bg-[#f4cf8f]/30">
      <article className="mx-auto max-w-2xl">

        <h1 className="mt-8 font-serif text-4xl font-bold tracking-tight sm:text-5xl text-[#f1ebe2]">
          Privacy Policy
        </h1>
        <p className="mt-2 text-[#c9c4bc]">Effective Date: February 10, 2025</p>

        <div className="mt-10 space-y-8 text-[#c9c4bc] leading-relaxed">
          <p>
            Welcome to Tap &amp; Swipe! This Privacy Policy explains how we
            collect, use, and protect your personal information. By using our
            website, you agree to the terms of this Privacy Policy.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              1. Information We Collect
            </h2>
            <p className="mt-2">We collect the following types of information:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <strong className="text-[#f1ebe2]">Personal Information:</strong> Your
                Discord username, Discord avatar, and payment information.
              </li>
              <li>
                <strong className="text-[#f1ebe2]">Non-Personal Information:</strong>{" "}
                Web cookies to enhance your browsing experience.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              2. Purpose of Data Collection
            </h2>
            <p className="mt-2">
              We collect your data for order processing, providing access to our
              course, and managing your Discord community membership.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              3. Data Sharing
            </h2>
            <p className="mt-2">
              We share certain data with trusted third-party service providers to
              help operate our business and serve you better:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <strong className="text-[#f1ebe2]">Stripe</strong> (to handle
                payments and subscriptions)
              </li>
              <li>
                <strong className="text-[#f1ebe2]">Discord</strong> (for
                authentication and community access)
              </li>
              <li>
                <strong className="text-[#f1ebe2]">Vercel</strong> (to host and serve
                the website)
              </li>
            </ul>
            <p className="mt-2">
              These third parties are contractually obligated to use your
              information only for the purposes for which we have partnered with
              them and are required to maintain the confidentiality and security
              of your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              4. Children&apos;s Privacy
            </h2>
            <p className="mt-2">
              We do not knowingly collect any personal information from children.
              If you believe we have collected data from a child, please contact
              us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              5. Updates to this Policy
            </h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. Any updates
              will be communicated via email or Discord.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">6. Contact Us</h2>
            <p className="mt-2">
              If you have any questions or concerns about this Privacy Policy,
              please contact us at{" "}
              <a
                href="mailto:arthurs.dev@gmail.com"
                className="text-[#f4cf8f] underline hover:text-[#f4cf8f]/80"
              >
                arthurs.dev@gmail.com
              </a>{" "}
              or reach out on our Discord server.
            </p>
          </section>

          <p className="pt-4 text-sm text-[#c9c4bc]">
            By using Tap &amp; Swipe, you agree to the terms outlined in this
            Privacy Policy.
          </p>
        </div>
      </article>
    </main>
  );
}
