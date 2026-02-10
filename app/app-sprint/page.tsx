import { MoonLitBackground } from "../components/MoonLitBackground";

interface PageProps {
  searchParams: Promise<{ status?: string; error?: string }>;
}

const messages: Record<string, { text: string; type: "success" | "error" | "info" }> = {
  success: { text: "Subscription activated! Check your Discord for the new role.", type: "success" },
  already_subscribed: { text: "You already have an active subscription.", type: "info" },
  canceled: { text: "Checkout was canceled. You can try again anytime.", type: "info" },
  oauth_denied: { text: "Discord authorization was denied.", type: "error" },
  missing_params: { text: "Invalid OAuth callback. Please try again.", type: "error" },
  invalid_state: { text: "Invalid session state. Please try again.", type: "error" },
  expired_state: { text: "Session expired. Please try again.", type: "error" },
  auth_failed: { text: "Authentication failed. Please try again.", type: "error" },
  session_expired: { text: "Session expired before checkout. Please try again.", type: "error" },
  checkout_failed: { text: "Could not create checkout session. Please try again.", type: "error" },
};

export default async function AppSprintPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const messageKey = params.status || params.error;
  const message = messageKey ? messages[messageKey] : null;

  return (
    <>
      <MoonLitBackground />
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-between px-4 py-8 text-white">
        <div />

        <section className="flex flex-col items-center justify-center text-center">
          <h1 className="font-serif text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl text-white">
            App Sprint
          </h1>

          <p className="mt-6 max-w-xl text-base text-slate-400/80 sm:text-lg">
            Join the community. Get access to exclusive resources, accountability,
            and a private Discord channel to help you ship your app.
          </p>

          {message && (
            <div
              className={`mt-6 rounded-lg px-4 py-3 text-sm ${
                message.type === "success"
                  ? "bg-green-500/20 text-green-300"
                  : message.type === "error"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-blue-500/20 text-blue-300"
              }`}
            >
              {message.text}
            </div>
          )}

          <a
            href="/api/auth/discord"
            className="mt-8 inline-flex items-center gap-3 rounded-lg bg-[#5865F2] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#4752C4]"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            Subscribe with Discord
          </a>
        </section>

        <footer className="w-full text-center text-sm text-gray-400">
          <a href="/" className="font-semibold hover:text-white transition-colors">
            TAP &amp; SWIPE
          </a>
        </footer>
      </main>
    </>
  );
}
