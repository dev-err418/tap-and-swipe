import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Mail, MessagesSquare, GraduationCap, LifeBuoy } from "lucide-react";

export const metadata: Metadata = {
  title: "You're in — Connect Your Discord",
  description:
    "You've joined App Sprint Community. Connect your Discord, join the server, and start the course.",
  alternates: { canonical: "/join-discord" },
  robots: { index: false, follow: false },
};

const steps = [
  {
    icon: Mail,
    title: "Check your inbox",
    body: (
      <>
        Whop just sent you a welcome email with a button to <strong>connect your Discord</strong>.
        Open it, click the button, and authorize. This is what tells our bot who you are inside Discord.
      </>
    ),
  },
  {
    icon: MessagesSquare,
    title: "Join the App Sprint Discord",
    body: (
      <>
        Once your Discord is connected on Whop, you&apos;ll be invited to the server automatically.
        Accept the invite. A private welcome channel will open just for you within ~10 seconds.
      </>
    ),
  },
  {
    icon: GraduationCap,
    title: "Open the course",
    body: (
      <>
        Head to{" "}
        <Link href="/learn" className="font-medium text-foreground underline underline-offset-4 hover:no-underline">
          tap-and-swipe.com/learn
        </Link>{" "}
        and start with <strong>Getting Started</strong>. Your access unlocks as soon as your Discord is linked.
      </>
    ),
  },
  {
    icon: LifeBuoy,
    title: "Stuck?",
    body: (
      <>
        If something didn&apos;t trigger after a couple of minutes, reply to the Whop welcome email or DM Arthur on Discord.
        Include the email you used at checkout so we can match it up.
      </>
    ),
  },
];

export default function JoinDiscordPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-24">
      <div className="mb-10 flex items-center gap-3 text-sm font-medium text-emerald-600">
        <CheckCircle2 className="h-5 w-5" />
        <span>Payment received</span>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        You&apos;re in. Three steps to start.
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        Welcome to App Sprint Community. Whop handles the Discord link on its side, so the
        course unlocks the moment you connect both. Here&apos;s the exact flow.
      </p>

      <ol className="mt-10 space-y-6">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="rounded-xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/5">
                <step.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold">
                  <span className="text-muted-foreground">{i + 1}.</span> {step.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/learn"
          className="inline-flex items-center justify-center rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:bg-foreground/90"
        >
          Open the course
        </Link>
        <a
          href="mailto:arthur@tap-and-swipe.com"
          className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-foreground/5"
        >
          Email Arthur
        </a>
      </div>
    </div>
  );
}
