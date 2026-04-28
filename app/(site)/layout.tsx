import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-black/10">
      <div className="print:hidden">
        <SiteNavbar />
      </div>
      <main className="flex flex-1 flex-col">{children}</main>
      <div className="print:hidden">
        <SiteFooter />
      </div>
    </div>
  );
}
