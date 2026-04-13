import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Tap & Swipe AppSprint — usage rights, refund policy, and governing law.",
  alternates: {
    canonical: "/app-sprint-community/tos",
  },
};

export default function TermsPage() {
  return (
    <>
    <style>{`html, body { background-color: #fff !important; }`}</style>
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black/10">

      {/* Navbar */}
      <nav className="relative z-20 mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-5">
        <Link href="/app-sprint-community" className="flex items-center gap-2.5">
          <img
            src="https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj"
            alt="ArthurBuildsStuff"
            className="h-8 w-8 rounded-full"
          />
          <span className="text-sm font-semibold text-black/90">Tap &amp; Swipe</span>
          <span className="text-sm text-black/40">by ArthurBuildsStuff</span>
        </Link>
      </nav>

      <main className="px-4 py-16">
        <article className="mx-auto max-w-2xl">

          <h1 className="mt-8 text-4xl font-extrabold tracking-tight sm:text-5xl text-black">
            Terms of Service
          </h1>
          <p className="mt-2 text-black/40">Effective Date: February 10, 2025</p>

          <div className="mt-10 space-y-8 text-black/50 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-black">1. Overview</h2>
              <p className="mt-2">
                Tap &amp; Swipe provides AppSprint, a course designed to help you
                build and launch mobile apps. Upon purchase, users receive access
                to:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>Access to our private Discord community, including course materials, updates, and group learning support.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">
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
                  If a refund is requested after more than 20% of the course has
                  been completed, access to the course materials will be revoked.
                </li>
              </ul>
            </section>

            <section id="refund">
              <h2 className="text-xl font-semibold text-black">
                3. Refund Policy
              </h2>
              <p className="mt-2">
                Full refunds are available within 14 days of purchase, provided
                that less than 20% of the roadmap content has been accessed or
                watched. To request a refund, contact us at{" "}
                <a
                  href="mailto:arthurs.dev@gmail.com"
                  className="text-[#FF9500] underline hover:text-[#FF9500]/80"
                >
                  arthurs.dev@gmail.com
                </a>{" "}
                or reach out on our Discord server.
              </p>
              <p className="mt-2">
                Once more than 20% of the roadmap content has been accessed, the
                digital content is considered substantially consumed. In accordance
                with EU Directive 2011/83/EU (Article 16(m)), by accessing the
                course content you acknowledge and consent to the loss of your
                right of withdrawal. This applies to all customers, including those
                in the European Union and European Economic Area.
              </p>
              <p className="mt-2">
                As part of your subscription, you receive a complimentary Pro
                license for AppSprint ASO at no additional cost. This license is
                provided as a free benefit of your membership and will be revoked
                upon cancellation of your subscription.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">4. User Data</h2>
              <p className="mt-2">
                We collect your Discord account information and payment information
                as part of our service. Non-personal data, such as cookies, may
                also be collected. For details, refer to our{" "}
                <Link
                  href="/app-sprint-community/privacy"
                  className="text-[#FF9500] underline hover:text-[#FF9500]/80"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">
                5. Governing Law
              </h2>
              <p className="mt-2">
                These Terms are governed by the laws of France.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">
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
              <h2 className="text-xl font-semibold text-black">
                7. Contact Information
              </h2>
              <p className="mt-2">
                If you have questions, please reach out at{" "}
                <a
                  href="mailto:arthurs.dev@gmail.com"
                  className="text-[#FF9500] underline hover:text-[#FF9500]/80"
                >
                  arthurs.dev@gmail.com
                </a>{" "}
                or on our Discord server.
              </p>
            </section>

            <p className="pt-4 text-sm text-black/40">
              By using Tap &amp; Swipe, you acknowledge and agree to these Terms.
            </p>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 px-6 py-10 text-sm text-black/40">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <p className="font-semibold text-black/80">Tap &amp; Swipe</p>
            <p className="mt-1">Made with ❤️ in 🇫🇷</p>
            <p className="mt-3">&copy; {new Date().getFullYear()} &middot; TAP &amp; SWIPE SAS</p>
            <p className="mt-1">SIREN: 100454206 &middot; TVA: FR23100454206</p>
          </div>
          <div>
            <p className="font-medium text-black/60">Products</p>
            <ul className="-mx-2 mt-2">
              <li>
                <Link href="/app-sprint-community" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  AppSprint Community
                </Link>
              </li>
              <li>
                <Link href="/aso" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  AppSprint ASO
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-black/60">Social</p>
            <ul className="-mx-2 mt-2">
              <li>
                <a href="https://www.youtube.com/@ArthurBuildsStuff" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  YouTube
                </a>
              </li>
              <li>
                <a href="https://www.linkedin.com/in/arthur-spalanzani/" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  LinkedIn
                </a>
              </li>
              <li>
                <a href="https://x.com/arthursbuilds" target="_blank" rel="noopener noreferrer" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  X (Twitter)
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-black/60">Legal</p>
            <ul className="-mx-2 mt-2">
              <li>
                <Link href="/app-sprint-community/tos" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/app-sprint-community/privacy" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/app-sprint-community/tos#refund" className="inline-block px-2 py-1.5 transition-colors hover:text-black/70">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
