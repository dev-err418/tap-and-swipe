import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Tap & Swipe — learn how we collect, use, and protect your personal information.",
  alternates: {
    canonical: "/app-sprint-community/privacy",
  },
};

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-2 text-black/40">Effective Date: February 10, 2025</p>

          <div className="mt-10 space-y-8 text-black/50 leading-relaxed">
            <p>
              Welcome to Tap &amp; Swipe! This Privacy Policy explains how we
              collect, use, and protect your personal information. By using our
              website, you agree to the terms of this Privacy Policy.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-black">
                1. Information We Collect
              </h2>
              <p className="mt-2">We collect the following types of information:</p>
              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>
                  <strong className="text-black">Personal Information:</strong> Your
                  Discord username, Discord avatar, and payment information.
                </li>
                <li>
                  <strong className="text-black">Non-Personal Information:</strong>{" "}
                  Web cookies to enhance your browsing experience.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">
                2. Purpose of Data Collection
              </h2>
              <p className="mt-2">
                We collect your data for order processing, providing access to our
                course, and managing your Discord community membership.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">
                3. Data Sharing
              </h2>
              <p className="mt-2">
                We share certain data with trusted third-party service providers to
                help operate our business and serve you better:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6">
                <li>
                  <strong className="text-black">Stripe</strong> (to handle
                  payments and subscriptions)
                </li>
                <li>
                  <strong className="text-black">Discord</strong> (for
                  authentication and community access)
                </li>
                <li>
                  <strong className="text-black">Cloudflare</strong> (CDN and DDoS
                  protection)
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
              <h2 className="text-xl font-semibold text-black">
                4. Children&apos;s Privacy
              </h2>
              <p className="mt-2">
                We do not knowingly collect any personal information from children.
                If you believe we have collected data from a child, please contact
                us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">
                5. Updates to this Policy
              </h2>
              <p className="mt-2">
                We may update this Privacy Policy from time to time. Any updates
                will be communicated via email or Discord.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-black">6. Contact Us</h2>
              <p className="mt-2">
                If you have any questions or concerns about this Privacy Policy,
                please contact us at{" "}
                <a
                  href="mailto:arthurs.dev@gmail.com"
                  className="text-[#FF9500] underline hover:text-[#FF9500]/80"
                >
                  arthurs.dev@gmail.com
                </a>{" "}
                or reach out on our Discord server.
              </p>
            </section>

            <p className="pt-4 text-sm text-black/40">
              By using Tap &amp; Swipe, you agree to the terms outlined in this
              Privacy Policy.
            </p>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/10 px-6 py-10 text-sm text-black/40">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <p className="font-semibold text-black/80">Tap &amp; Swipe</p>
            <p className="mt-1 text-black/80">Made with ❤️ in 🇫🇷</p>
            <p className="mt-3">&copy; {new Date().getFullYear()} &middot; TAP &amp; SWIPE SAS</p>
            <p className="mt-1">SIREN: 100454206 &middot; TVA: FR23100454206</p>
          </div>
          <div>
            <p className="font-medium text-black/80">Products</p>
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
            <p className="font-medium text-black/80">Social</p>
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
            <p className="font-medium text-black/80">Legal</p>
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
