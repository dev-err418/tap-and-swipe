import type { Metadata } from "next";

export const metadata: Metadata = {
  other: {
    "apple-itunes-app": "app-id=6760554617",
  },
};

export default function NetPayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
