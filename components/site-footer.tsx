import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-6 py-10 text-sm text-foreground/40">
      <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <p className="font-semibold text-foreground/80">Tap &amp; Swipe</p>
          <p className="mt-1 text-foreground/80">Made with ❤️ in 🇫🇷</p>
          <p className="mt-3">
            &copy; {new Date().getFullYear()} &middot; TAP &amp; SWIPE SAS
          </p>
          <p className="mt-1">SIREN: 100454206 &middot; TVA: FR23100454206</p>
        </div>
        <div>
          <p className="font-medium text-foreground/80">Products</p>
          <ul className="-mx-2 mt-2">
            <li>
              <Link
                href="/app-sprint-community"
                className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70"
              >
                AppSprint Community
              </Link>
            </li>
            <li>
              <Link
                href="/aso"
                className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70"
              >
                AppSprint ASO
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-foreground/80">Social</p>
          <ul className="-mx-2 mt-2">
            <li>
              <a
                href="https://www.youtube.com/@ArthurBuildsStuff"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70"
              >
                YouTube
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/in/arthur-spalanzani/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70"
              >
                LinkedIn
              </a>
            </li>
            <li>
              <a
                href="https://x.com/arthursbuilds"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70"
              >
                X (Twitter)
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-foreground/80">Legal</p>
          <ul className="-mx-2 mt-2">
            <li>
              <Link
                href="/privacy"
                className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70"
              >
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
