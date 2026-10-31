import localFont from "next/font/local";
import { cookies } from "next/headers";
import { AnalyticsTheme } from "@/components/analytics/AnalyticsTheme";
import "./theme.css";

const saans = localFont({
  src: [
    {
      path: "../fonts/Saans-Uprights-Variable.woff2",
      weight: "300 900",
      style: "normal",
    },
  ],
  variable: "--font-saans",
  display: "swap",
});

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const saved = (await cookies()).get("analytics-appearance")?.value;
  const initialAppearance = saved === "light" || saved === "dark" ? saved : "system";
  return (
    <AnalyticsTheme
      initialAppearance={initialAppearance}
      className={`${saans.variable} ${saans.className} analytics-canvas min-h-dvh text-foreground antialiased`}
    >
      <style>{`
        html { scrollbar-gutter: stable; }
        /* Modal scroll locking supplies its own scrollbar gap. */
        html:has(body[data-scroll-locked]) { scrollbar-gutter: auto; }
      `}</style>
      {children}
    </AnalyticsTheme>
  );
}
