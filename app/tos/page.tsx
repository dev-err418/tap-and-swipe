import Link from "next/link";

export const metadata = {
  title: "Terms of Service - Tap & Swipe",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-16 text-white">
      <article className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          &larr; Back to home
        </Link>

        <h1 className="mt-8 font-serif text-4xl font-bold tracking-tight sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-slate-400">Effective Date: February 10, 2025</p>

        <div className="mt-10 space-y-8 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white">1. Overview</h2>
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
            <h2 className="text-xl font-semibold text-white">
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
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">
              3. Refund Policy
            </h2>
            <p className="mt-2">
              If you are not satisfied with the course, you may request a full
              refund within 7 days of purchase. To request a refund, contact us
              at{" "}
              <a
                href="mailto:arthurs.dev@gmail.com"
                className="text-white underline hover:text-slate-300"
              >
                arthurs.dev@gmail.com
              </a>{" "}
              or reach out on our Discord server.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">4. User Data</h2>
            <p className="mt-2">
              We collect your Discord account information and payment information
              as part of our service. Non-personal data, such as cookies, may
              also be collected. For details, refer to our{" "}
              <Link
                href="/privacy"
                className="text-white underline hover:text-slate-300"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">
              5. Governing Law
            </h2>
            <p className="mt-2">
              These Terms are governed by the laws of France.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">
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
            <h2 className="text-xl font-semibold text-white">
              7. Contact Information
            </h2>
            <p className="mt-2">
              If you have questions, please reach out at{" "}
              <a
                href="mailto:arthurs.dev@gmail.com"
                className="text-white underline hover:text-slate-300"
              >
                arthurs.dev@gmail.com
              </a>{" "}
              or on our Discord server.
            </p>
          </section>

          <p className="pt-4 text-sm text-slate-500">
            By using Tap &amp; Swipe, you acknowledge and agree to these Terms.
          </p>
        </div>
      </article>
    </main>
  );
}
