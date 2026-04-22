import type { Metadata } from "next";
import { headers } from "next/headers";
import JoinClient from "./join-client";
import { BLOCKED_COUNTRIES } from "@/lib/blocked-countries";

export const metadata: Metadata = {
  title: "Join — Check Your Eligibility",
  description:
    "Check your eligibility and find the best path to build and grow your mobile app business.",
  alternates: {
    canonical: "/join",
  },
};

export default async function JoinPage() {
  const h = await headers();
  const country = h.get("cf-ipcountry") || "";
  const allowHighTicket = !BLOCKED_COUNTRIES.has(country);

  return <JoinClient allowHighTicket={allowHighTicket} />;
}
