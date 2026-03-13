import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — NetPay",
  description: "Privacy policy for NetPay, the paycheck and take-home pay calculator app.",
  alternates: {
    canonical: "/netpay/privacy",
  },
};

export default function NetPayPrivacyPage() {
  return (
    <AppLegalPage
      appName="NetPay"
      appSlug="netpay"
      primaryColor="#818CF8"
      backgroundColor="#0F0F1A"
      textColor="#E8E8F5"
      mutedColor="#8F8FA3"
      contentPath="content/netpay/privacy.md"
    />
  );
}
