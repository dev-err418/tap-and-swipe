import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "You're in — Connect Your Discord",
  description:
    "You've joined App Sprint Community. Connect your Discord, join the server, and start the course.",
  alternates: { canonical: "/join-discord" },
  robots: { index: false, follow: false },
};

export default function JoinDiscordPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        You&apos;re in
      </h1>
      <p className="mt-4 leading-relaxed text-foreground/70">
        Welcome to App Sprint Community. Three quick steps to get the course unlocked
        and your Discord set up.
      </p>

      <hr className="my-10 border-border" />

      <h2 className="mt-12 mb-4 text-2xl font-semibold tracking-tight">
        1. Check your inbox
      </h2>
      <p className="mb-5 leading-relaxed text-foreground/70">
        Whop just sent you a welcome email with a button to connect your Discord.
        Open it, click the button, and authorize. This is what tells our bot who
        you are inside Discord.
      </p>

      <h2 className="mt-12 mb-4 text-2xl font-semibold tracking-tight">
        2. Join the AppSprint Community discord
      </h2>
      <p className="mb-5 leading-relaxed text-foreground/70">
        Once your Discord is connected on Whop, you&apos;ll be invited to the server
        automatically. Accept the invite. A private welcome channel will open
        just for you within ~10 seconds.
      </p>

      <h2 className="mt-12 mb-4 text-2xl font-semibold tracking-tight">
        3. Open the course
      </h2>
      <p className="mb-5 leading-relaxed text-foreground/70">
        Head to{" "}
        <Link
          href="/learn"
          className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
        >
          tap-and-swipe.com/learn
        </Link>{" "}
        and start with Getting Started. Your access unlocks as soon as your
        Discord is linked.
      </p>

      <hr className="my-10 border-border" />

      <h2 className="mt-12 mb-4 text-2xl font-semibold tracking-tight">
        Stuck?
      </h2>
      <p className="mb-5 leading-relaxed text-foreground/70">
        Contact me on Whop support, or email me directly at{" "}
        <a
          href="mailto:arthurs.dev@gmail.com"
          className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
        >
          arthurs.dev@gmail.com
        </a>
        .
      </p>
    </div>
  );
}
