import type { Metadata } from "next";
import AppSprint1on1Funnel from "@/components/AppSprint1on1Funnel";

export const metadata: Metadata = {
    title: "1:1 App Sprint Mentorship — High-Level Coaching to Launch Your App",
    description:
        "Apply for the exclusive 1:1 App Sprint mentorship. Get personalized coaching, code reviews, and strategy sessions to launch your mobile app and hit revenue fast.",
    keywords: [
        "1 on 1 app coaching",
        "mobile app mentorship",
        "app sprint mentorship",
        "app launch coaching",
        "personal app development mentor",
        "high ticket app coaching",
    ],
    openGraph: {
        title: "1:1 App Sprint Mentorship — High-Level Coaching to Launch Your App",
        description:
            "Apply for the exclusive 1:1 App Sprint mentorship. Personalized coaching, code reviews, and strategy sessions.",
    },
    twitter: {
        title: "1:1 App Sprint Mentorship — High-Level Coaching to Launch Your App",
        description:
            "Apply for the exclusive 1:1 App Sprint mentorship. Personalized coaching, code reviews, and strategy sessions.",
    },
    alternates: {
        canonical: "/app-sprint-1-on-1",
    },
};

export default function AppSprint1on1Page() {
    return <AppSprint1on1Funnel />;
}
