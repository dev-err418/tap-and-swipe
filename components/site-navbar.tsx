import Link from "next/link";

export function SiteNavbar() {
  return (
    <nav className="relative z-20 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="text-sm font-semibold text-foreground/90">
          Tap &amp; Swipe
        </span>
        <span className="hidden text-sm text-muted-foreground sm:inline">
          by ArthurBuildsStuff
        </span>
      </Link>
      <div className="flex items-center gap-6">
        <Link
          href="/episodes"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground/70"
        >
          Episodes
        </Link>
        <Link
          href="/case-studies"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground/70"
        >
          Case Studies
        </Link>
        <Link
          href="/about"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground/70"
        >
          About
        </Link>
      </div>
    </nav>
  );
}
