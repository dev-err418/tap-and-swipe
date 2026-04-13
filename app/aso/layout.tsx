import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "AppSprint ASO — App Store Optimization for macOS",
    description:
        "The all-in-one macOS app for App Store Optimization. Keyword research, metadata editing via App Store Connect, and Apple Ads campaign management.",
    keywords: [
        "ASO",
        "App Store Optimization",
        "keyword research",
        "Apple Search Ads",
        "App Store Connect",
        "macOS app",
        "AppSprint",
    ],
    openGraph: {
        title: "AppSprint ASO — App Store Optimization for macOS",
        description:
            "The all-in-one macOS app for App Store Optimization. Keywords, metadata, and Apple Ads — in one place.",
        type: "website",
    },
    twitter: {
        title: "AppSprint ASO — App Store Optimization for macOS",
        description:
            "The all-in-one macOS app for App Store Optimization. Keywords, metadata, and Apple Ads — in one place.",
    },
    alternates: {
        canonical: "/aso",
    },
};

export default function AsoLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
