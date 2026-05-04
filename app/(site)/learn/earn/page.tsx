import { ArrowUpRight, Link2, Repeat, Wallet } from "lucide-react";
import EarningsTable from "@/components/roadmap/EarningsTable";

const WHOP_AFFILIATE_LINKS_URL = "https://whop.com/appsprint-community/affiliates/";

export default function EarnPage() {
  return (
    <>
      <div className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Earn 30% recurring commission
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Refer new members to AppSprint Community and earn a slice of every
          subscription they pay, every month, for as long as they stay
          subscribed.
        </p>
      </div>

      <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm text-black/60">
            Grab your unique referral link from Whop and share it anywhere.
            We&apos;ll handle the tracking and payouts.
          </p>
          <a
            href={WHOP_AFFILIATE_LINKS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/85"
          >
            Get your affiliate link
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Highlight
          icon={<Wallet className="h-4 w-4" />}
          title="30% commission"
        />
        <Highlight
          icon={<Repeat className="h-4 w-4" />}
          title="Recurring forever"
        />
        <Highlight
          icon={<Link2 className="h-4 w-4" />}
          title="One link, automatic"
        />
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">
          Three steps to start earning
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          <Step
            number="1."
            title="Grab your affiliate link"
            body="Open the affiliate dashboard above (sign in to Whop if asked) and copy your unique referral URL."
          />
          <Step
            number="2."
            title="Share it anywhere"
            body="Post it on X, in YouTube descriptions, in your newsletter, or DM it to a friend who's been thinking about building an app."
          />
          <Step
            number="3."
            title="Get paid"
            body="Whop pays out commissions automatically after a 30-day clearing period. Track your earnings inside the affiliate dashboard."
          />
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">
          What you could earn
        </h2>
        <EarningsTable />
      </section>

      <p className="mt-10 text-center text-xs text-black/40">
        Commission rate set on Whop and may change. Payouts and tracking are
        handled entirely by Whop, see their{" "}
        <a
          href="https://docs.whop.com/manage-your-business/growth-marketing/affiliate-program"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-black/60"
        >
          affiliate documentation
        </a>{" "}
        for terms.
      </p>
    </>
  );
}

function Highlight({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5">
      <span className="text-black">{icon}</span>
      <span className="text-sm font-semibold text-black">{title}</span>
    </div>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-2xl border border-black/10 bg-white p-5">
      <h3 className="font-semibold text-black">
        {number} {title}
      </h3>
      <p className="mt-1 text-sm text-black/55">{body}</p>
    </li>
  );
}
