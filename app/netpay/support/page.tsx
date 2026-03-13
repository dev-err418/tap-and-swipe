import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Support — NetPay",
  description: "Get help and support for NetPay, the paycheck and take-home pay calculator app.",
  alternates: {
    canonical: "/netpay/support",
  },
};

export default function NetPaySupportPage() {
  return (
    <AppLegalPage
      appName="NetPay"
      appSlug="netpay"
      primaryColor="#818CF8"
      backgroundColor="#0F0F1A"
      textColor="#E8E8F5"
      mutedColor="#8F8FA3"
      contentPath="content/netpay/support.md"
    />
  );
}
