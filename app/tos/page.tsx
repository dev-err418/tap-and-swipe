import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Tap & Swipe App Sprint — usage rights, refund policy, and governing law.",
  alternates: {
    canonical: "/tos",
  },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#2a2725] px-4 py-16 text-[#f1ebe2] selection:bg-[#f4cf8f]/30">
      <article className="mx-auto max-w-2xl">

        <h1 className="mt-8 font-serif text-4xl font-bold tracking-tight sm:text-5xl text-[#f1ebe2]">
          Terms of Service
        </h1>
        <p className="mt-2 text-[#c9c4bc]">Effective Date: February 10, 2025</p>

        <div className="mt-10 space-y-8 text-[#c9c4bc] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">1. Overview</h2>
            <p className="mt-2">
              Tap &amp; Swipe provides App Sprint, a course designed to help you
              build and launch mobile apps. Upon purchase, users receive access
              to:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Access to our private Discord community, including course materials, updates, and group learning support.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              2. Usage Rights
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                Users are granted personal, non-transferable, and non-exclusive
                access to the course materials.
              </li>
              <li>
                Sharing or distributing video content or course materials is
                strictly prohibited.
              </li>
              <li>
                Discord community access is provided on a best-effort basis, with
                group support available during community hours.
              </li>
              <li>
                If a refund is requested after more than 10% of the course has
                been completed, access to the course materials will be revoked.
              </li>
            </ul>
          </section>

          <section id="refund">
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              3. Refund Policy
            </h2>
            <p className="mt-2">
              Full refunds are available within 14 days of purchase, no questions
              asked. To request a refund, contact us at{" "}
              <a
                href="mailto:arthurs.dev@gmail.com"
                className="text-[#f4cf8f] underline hover:text-[#f4cf8f]/80"
              >
                arthurs.dev@gmail.com
              </a>{" "}
              or reach out on our Discord server.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">4. User Data</h2>
            <p className="mt-2">
              We collect your Discord account information and payment information
              as part of our service. Non-personal data, such as cookies, may
              also be collected. For details, refer to our{" "}
              <Link
                href="/privacy"
                className="text-[#f4cf8f] underline hover:text-[#f4cf8f]/80"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              5. Governing Law
            </h2>
            <p className="mt-2">
              These Terms are governed by the laws of France.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              6. Modifications
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>We may update these Terms from time to time.</li>
              <li>
                Any updates will be communicated via email or Discord.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              7. Contact Information
            </h2>
            <p className="mt-2">
              If you have questions, please reach out at{" "}
              <a
                href="mailto:arthurs.dev@gmail.com"
                className="text-[#f4cf8f] underline hover:text-[#f4cf8f]/80"
              >
                arthurs.dev@gmail.com
              </a>{" "}
              or on our Discord server.
            </p>
          </section>

          <p className="pt-4 text-sm text-[#c9c4bc]">
            By using Tap &amp; Swipe, you acknowledge and agree to these Terms.
          </p>
        </div>
      </article>
    </main>
  );
}
