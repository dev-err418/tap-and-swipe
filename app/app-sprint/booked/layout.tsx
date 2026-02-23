import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Call is Booked — App Sprint",
  description:
    "Your discovery call with Arthur is confirmed. Watch the preparation video before your appointment.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/app-sprint/booked" },
};

export default function BookedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
