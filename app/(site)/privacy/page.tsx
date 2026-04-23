import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Tap & Swipe collects, uses, and protects your personal data.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: April 16, 2026
      </p>

      <div className="prose-site mt-10 space-y-8 leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">Tap &amp; Swipe SASU</strong>{" "}
          (SIREN: 100454206), operated by Arthur (&quot;we&quot;,
          &quot;us&quot;, &quot;our&quot;), operates the website{" "}
          <a href="https://tap-and-swipe.com">https://tap-and-swipe.com</a> and
          the associated newsletter. This Privacy Policy explains how we
          collect, use, and protect your personal data when you visit our website
          or subscribe to our newsletter.
        </p>
        <p>
          We are committed to protecting your privacy in accordance with the EU
          General Data Protection Regulation (GDPR) and applicable French data
          protection law.
        </p>

        {/* What Data We Collect */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            What Data We Collect
          </h2>

          <h3 className="mt-4 font-semibold text-foreground">
            Newsletter Subscription
          </h3>
          <p className="mt-2">
            When you subscribe to our newsletter, we collect your{" "}
            <strong className="text-foreground">email address</strong>. You are
            added to our mailing list as soon as you submit the form.
          </p>

          <h3 className="mt-4 font-semibold text-foreground">
            Email Analytics
          </h3>
          <p className="mt-2">
            When we send you a newsletter, we may track whether you opened the
            email and which links you clicked. This helps us understand what
            content resonates with our audience and improve future newsletters.
          </p>

          <h3 className="mt-4 font-semibold text-foreground">
            Website Analytics
          </h3>
          <p className="mt-2">
            We collect first-party, anonymized usage data on our own servers:
            pages visited, approximate geographic region (from your IP country),
            and referral source. We store a single first-party cookie
            (<code>visitor_id</code>) to deduplicate visitors. No personal data
            is shared with third parties for analytics.
          </p>
        </section>

        {/* How We Use Your Data */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            How We Use Your Data
          </h2>
          <p className="mt-2">
            We use your personal data for the following purposes:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              Sending you our newsletter (legal basis: your consent, GDPR Art.
              6(1)(a))
            </li>
            <li>
              Measuring email engagement such as open and click rates (legal
              basis: our legitimate interest in improving our content, GDPR Art.
              6(1)(f))
            </li>
            <li>
              Analyzing website traffic to improve our website (legal basis: our
              legitimate interest, GDPR Art. 6(1)(f))
            </li>
          </ul>
        </section>

        {/* Third-Party Services */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Third-Party Services
          </h2>
          <p className="mt-2">
            We use the following third-party services to operate our newsletter
            and website:
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-foreground">
                  <th className="pb-2 pr-4 font-semibold">Service</th>
                  <th className="pb-2 pr-4 font-semibold">Purpose</th>
                  <th className="pb-2 font-semibold">Provider Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-4">Amazon SES</td>
                  <td className="py-2 pr-4">Email delivery</td>
                  <td className="py-2">
                    Amazon Web Services EMEA SARL (Luxembourg), data may be
                    processed in AWS EU regions
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">Listmonk</td>
                  <td className="py-2 pr-4">
                    Newsletter management (self-hosted)
                  </td>
                  <td className="py-2">Hosted on our own infrastructure</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4">
            We do not sell, rent, or share your email address with any third
            party for marketing purposes.
          </p>
        </section>

        {/* Data Transfers */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Data Transfers Outside the EU
          </h2>
          <p className="mt-2">
            Amazon Web Services may process data outside the European Economic
            Area. These transfers are safeguarded by Standard Contractual
            Clauses (SCCs) and, where applicable, the EU-US Data Privacy
            Framework. You can learn more at{" "}
            <a
              href="https://aws.amazon.com/compliance/gdpr-center/"
              target="_blank"
              rel="noopener noreferrer"
            >
              AWS GDPR Center
            </a>
            .
          </p>
        </section>

        {/* Data Retention */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Data Retention
          </h2>
          <p className="mt-2">
            We retain your email address for as long as you remain subscribed to
            our newsletter. If you unsubscribe, your email is removed from our
            active mailing list and added to a suppression list to prevent future
            sends. Website analytics data is retained for 12 months.
          </p>
        </section>

        {/* Your Rights */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">Your Rights</h2>
          <p className="mt-2">Under the GDPR, you have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong className="text-foreground">Access</strong> the personal
              data we hold about you
            </li>
            <li>
              <strong className="text-foreground">Rectify</strong> inaccurate
              personal data
            </li>
            <li>
              <strong className="text-foreground">Erase</strong> your personal
              data (&quot;right to be forgotten&quot;)
            </li>
            <li>
              <strong className="text-foreground">Restrict</strong> processing
              of your personal data
            </li>
            <li>
              <strong className="text-foreground">Data portability</strong>:
              receive your data in a structured, commonly used format
            </li>
            <li>
              <strong className="text-foreground">Object</strong> to processing
              based on legitimate interest
            </li>
            <li>
              <strong className="text-foreground">Withdraw consent</strong> at
              any time by unsubscribing from the newsletter
            </li>
          </ul>
          <p className="mt-4">
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:arthur@tap-and-swipe.com">
              arthur@tap-and-swipe.com
            </a>
            . We will respond within 30 days.
          </p>
          <p className="mt-2">
            You also have the right to lodge a complaint with the French data
            protection authority, the CNIL (
            <a
              href="https://www.cnil.fr"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.cnil.fr
            </a>
            ).
          </p>
        </section>

        {/* Unsubscribing */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Unsubscribing
          </h2>
          <p className="mt-2">
            Every newsletter email includes a one-click unsubscribe link. You can
            also contact us directly at{" "}
            <a href="mailto:arthur@tap-and-swipe.com">
              arthur@tap-and-swipe.com
            </a>{" "}
            to be removed from our mailing list.
          </p>
        </section>

        {/* Children */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">Children</h2>
          <p className="mt-2">
            We do not knowingly collect personal data from anyone under the age
            of 16. If you believe a minor has subscribed to our newsletter,
            please contact us and we will promptly delete their data.
          </p>
        </section>

        {/* Changes */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Changes to This Policy
          </h2>
          <p className="mt-2">
            We may update this Privacy Policy from time to time. If we make
            significant changes, we will notify subscribers via email. The latest
            version will always be available on this page.
          </p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          <p className="mt-2">
            For any questions about this Privacy Policy or your personal data:
          </p>
          <p className="mt-2">
            <strong className="text-foreground">Arthur</strong>
            <br />
            Tap &amp; Swipe SASU
            <br />
            Email:{" "}
            <a href="mailto:arthur@tap-and-swipe.com">
              arthur@tap-and-swipe.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
