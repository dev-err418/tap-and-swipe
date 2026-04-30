import type { Metadata } from "next";
import { UnsubscribeCard } from "../(site)/unsubscribe/UnsubscribeCard";

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
    <section className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <UnsubscribeCard contactId={contact ?? null} />
      </div>
    </section>
  );
}
