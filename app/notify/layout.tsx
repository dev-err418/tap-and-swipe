import type { Metadata } from "next";

export const metadata: Metadata = {
  other: {
    "apple-itunes-app": "app-id=6763496503",
  },
};

export default function NotifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
