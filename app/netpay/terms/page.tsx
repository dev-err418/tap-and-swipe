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
      contentPath="content/netpay/terms.md"
    />
  );
}
