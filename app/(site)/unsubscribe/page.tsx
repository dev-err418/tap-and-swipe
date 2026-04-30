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
    <section className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <h1 className="mb-3 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          Manage your subscription
        </h1>
        <p className="mb-10 text-center text-sm text-black/60">
          Update your Tap & Swipe newsletter preferences.
        </p>
        <UnsubscribeCard contactId={contact ?? null} />
      </div>
    </section>
  );
}
