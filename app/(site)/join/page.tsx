import type { Metadata } from "next";
import JoinClient from "./join-client";

export const metadata: Metadata = {
  title: "Join — Check Your Eligibility",
  description:
    "Check your eligibility and find the best path to build and grow your mobile app business.",
  alternates: {
    canonical: "/join",
  },
};

export default function JoinPage() {
  return <JoinClient />;
}
