import type { Metadata } from "next";
import AppLegalPage from "@/components/AppLegalPage";

export const metadata: Metadata = {
  title: "Terms of Use — NetPay",
  description: "Terms of use for NetPay, the paycheck and take-home pay calculator app.",
  alternates: {
    canonical: "/netpay/terms",
  },
};

export default function NetPayTermsPage() {
  return (
    <AppLegalPage
      appName="NetPay"
      appSlug="netpay"
      primaryColor="#818CF8"
      backgroundColor="#0F0F1A"
      textColor="#E8E8F5"
      mutedColor="#8F8FA3"
      contentPath="content/netpay/terms.md"
    />
  );
}
