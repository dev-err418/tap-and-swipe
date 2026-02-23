export const metadata = {
  title: "Privacy Policy — App Sprint Quiz",
  description:
    "Privacy Policy for the App Sprint Quiz — learn how we collect, use, and protect your personal information.",
  alternates: {
    canonical: "/app-sprint/privacy",
  },
};

export default function QuizPrivacyPage() {
  return (
    <main className="min-h-screen bg-[#2a2725] px-4 py-16 text-[#f1ebe2] selection:bg-[#f4cf8f]/30">
      <article className="mx-auto max-w-2xl">

        <h1 className="mt-8 font-serif text-4xl font-bold tracking-tight sm:text-5xl text-[#f1ebe2]">
          Privacy Policy
        </h1>
        <p className="mt-2 text-[#c9c4bc]">Effective Date: February 23, 2026</p>

        <div className="mt-10 space-y-8 text-[#c9c4bc] leading-relaxed">
          <p>
            This Privacy Policy explains how we collect, use, and protect your
            personal information when you complete the App Sprint Quiz on
            tap-and-swipe.com. By submitting your information through the quiz,
            you agree to the terms outlined below.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              1. Information We Collect
            </h2>
            <p className="mt-2">
              When you complete the quiz and submit the contact form, we collect:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <strong className="text-[#f1ebe2]">First name</strong> — to personalize
                your results and follow-up communications.
              </li>
              <li>
                <strong className="text-[#f1ebe2]">Email address</strong> — to send you
                your personalized action plan and follow-up emails.
              </li>
              <li>
                <strong className="text-[#f1ebe2]">Phone number</strong> — to contact you
                about your results and the App Sprint program if relevant.
              </li>
              <li>
                <strong className="text-[#f1ebe2]">Quiz answers</strong> — to determine
                your creator profile and generate a personalized action plan.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              2. How We Use Your Information
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Generate your personalized quiz results and action plan.</li>
              <li>Send you follow-up emails related to the App Sprint program.</li>
              <li>
                Contact you by phone or email to discuss your goals and how we can
                help.
              </li>
              <li>
                Improve the quiz experience based on aggregated, anonymized
                response data.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              3. Data Sharing
            </h2>
            <p className="mt-2">
              We do not sell your personal information. We may share your data
              with the following trusted service providers:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <strong className="text-[#f1ebe2]">Vercel</strong> — website hosting and
                serverless functions.
              </li>
              <li>
                <strong className="text-[#f1ebe2]">Database provider</strong> — secure
                storage of quiz submissions.
              </li>
            </ul>
            <p className="mt-2">
              These providers are contractually obligated to use your data only
              for the purposes described and to maintain its confidentiality and
              security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              4. Data Retention
            </h2>
            <p className="mt-2">
              We retain your quiz submission data for as long as necessary to
              provide our services. You may request deletion of your data at any
              time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              5. Your Rights
            </h2>
            <p className="mt-2">You have the right to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data.</li>
              <li>Withdraw consent to being contacted at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              6. Children&apos;s Privacy
            </h2>
            <p className="mt-2">
              We do not knowingly collect personal information from children under
              16. If you believe we have collected data from a child, please
              contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">
              7. Updates to this Policy
            </h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. Any changes
              will be reflected on this page with an updated effective date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#f1ebe2]">8. Contact Us</h2>
            <p className="mt-2">
              If you have any questions about this Privacy Policy or wish to
              exercise your rights, please contact us at{" "}
              <a
                href="mailto:arthurs.dev@gmail.com"
                className="text-[#f4cf8f] underline hover:text-[#f4cf8f]/80"
              >
                arthurs.dev@gmail.com
              </a>
              .
            </p>
          </section>

          <p className="pt-4 text-sm text-[#c9c4bc]">
            By submitting the App Sprint Quiz, you agree to the terms outlined in
            this Privacy Policy.
          </p>
        </div>
      </article>
    </main>
  );
}
