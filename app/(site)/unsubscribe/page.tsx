import type { Metadata } from "next";
import { UnsubscribeCard } from "./UnsubscribeCard";

export const metadata: Metadata = {
  title: "Manage subscription",
  description: "Manage your Tap & Swipe newsletter subscription.",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string }>;
}) {
  const { contact } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-24">
      <h1 className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Manage your subscription
      </h1>
      <p className="mb-10 text-center text-sm text-black/60">
        Update your Tap & Swipe newsletter preferences.
      </p>
      <UnsubscribeCard contactId={contact ?? null} />
    </main>
  );
}
