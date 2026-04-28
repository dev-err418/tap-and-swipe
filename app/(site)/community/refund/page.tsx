import Link from "next/link";

export const metadata = {
  title: "Refund Policy",
  description:
    "Refund and cancellation policy for Tap & Swipe AppSprint Community.",
  alternates: {
    canonical: "/community/refund",
  },
};

export default function RefundPage() {
  return (
    <div className="px-4 py-16">
      <article className="mx-auto max-w-2xl">
        <h1 className="mt-8 text-4xl font-extrabold tracking-tight sm:text-5xl text-black">
          Refund Policy
        </h1>
        <p className="mt-2 text-black/40">Effective Date: April 27, 2026</p>

        <div className="mt-10 space-y-8 text-black/50 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-black">
              1. Community plan (99€/mo)
            </h2>
            <p className="mt-2">
              The Community subscription gives you immediate access to the
              private Discord, group calls, and other community services.
              Because the service begins delivering value the moment you join,
              we do not issue refunds for the Community plan.
            </p>
            <p className="mt-2">
              You can cancel at any time from your account settings. Your
              membership remains active until the end of the current billing
              period; you will not be charged again after cancellation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black">
              2. Community + Course + AppSprint ASO plan (149€/mo)
            </h2>
            <p className="mt-2">
              The Community + Course + AppSprint ASO plan includes the items above plus access
              to the AppSprint roadmap and the boilerplate. A 14-day refund is
              available on the Course portion of this plan, provided that:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                Less than 20% of the roadmap content has been accessed or
                watched, and
              </li>
              <li>
                You have not claimed access to the boilerplate (GitHub
                repository).
              </li>
            </ul>
            <p className="mt-2">
              If either threshold is exceeded, the digital content is considered
              substantially consumed and the refund is no longer available.
              Cancellation works the same as for the Community plan above:
              cancel anytime, access continues until the end of the billing
              period.
            </p>
            <p className="mt-2">
              To request a refund, email{" "}
              <a
                href="mailto:arthur@tap-and-swipe.com"
                className="text-[#FF9500] underline hover:text-[#FF9500]/80"
              >
                arthur@tap-and-swipe.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black">
              3. EU right of withdrawal
            </h2>
            <p className="mt-2">
              By completing checkout and accessing the community or the course
              platform, you expressly consent to the immediate provision of
              digital services and acknowledge that you lose your right of
              withdrawal under EU Directive 2011/83/EU (Article 16(m)). This
              applies to all customers, including those located in the European
              Union and European Economic Area.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black">
              4. AppSprint ASO license
            </h2>
            <p className="mt-2">
              Both plans include a complimentary license to AppSprint ASO at no
              additional cost. The license is provided as a free benefit of
              your membership and will be revoked when your subscription ends.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-black">5. Contact</h2>
            <p className="mt-2">
              For any refund or cancellation questions, email{" "}
              <a
                href="mailto:arthur@tap-and-swipe.com"
                className="text-[#FF9500] underline hover:text-[#FF9500]/80"
              >
                arthur@tap-and-swipe.com
              </a>
              . See also our{" "}
              <Link
                href="/community/tos"
                className="text-[#FF9500] underline hover:text-[#FF9500]/80"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/community/privacy"
                className="text-[#FF9500] underline hover:text-[#FF9500]/80"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
