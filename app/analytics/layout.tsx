import localFont from "next/font/local";

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

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${saans.variable} ${saans.className} analytics-canvas min-h-dvh text-black antialiased`}
    >
      {children}
    </div>
  );
}
