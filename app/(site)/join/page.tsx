import type { Metadata } from "next";
import { headers } from "next/headers";
import JoinClient from "./join-client";

export const metadata: Metadata = {
  title: "Join — Check Your Eligibility",
  description:
    "Check your eligibility and find the best path to build and grow your mobile app business.",
  alternates: {
    canonical: "/join",
  },
};

const BLOCKED_COUNTRIES = new Set([
  // Africa
  "DZ","AO","BJ","BW","BF","BI","CV","CM","CF","TD","KM","CG","CD","CI","DJ",
  "EG","GQ","ER","SZ","ET","GA","GM","GH","GN","GW","KE","LS","LR","LY","MG",
  "MW","ML","MR","MU","MA","MZ","NA","NE","NG","RW","ST","SN","SC","SL","SO",
  "ZA","SS","SD","TZ","TG","TN","UG","ZM","ZW",
  // India
  "IN",
]);

export default async function JoinPage() {
  const h = await headers();
  const country = h.get("cf-ipcountry") || "";
  const allowHighTicket = !BLOCKED_COUNTRIES.has(country);

  return <JoinClient allowHighTicket={allowHighTicket} />;
}
