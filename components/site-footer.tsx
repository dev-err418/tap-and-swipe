import Link from "next/link";
import { Youtube, Linkedin } from "lucide-react";
import { SiX } from "@icons-pack/react-simple-icons";

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-6 py-10 text-sm text-foreground/60">
      <div className="mx-auto grid w-full max-w-5xl gap-8 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <p className="font-semibold text-foreground/80">Tap &amp; Swipe</p>
          <p className="mt-1 text-foreground/80">Made with ❤️ in 🇫🇷</p>
          <div className="mt-3 flex items-center gap-3">
            <a
              href="https://www.youtube.com/@ArthurBuildsStuff"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/50 transition-colors hover:text-foreground/80"
              aria-label="YouTube"
            >
              <Youtube size={16} />
            </a>
            <a
              href="https://www.linkedin.com/in/arthur-spalanzani/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/50 transition-colors hover:text-foreground/80"
              aria-label="LinkedIn"
            >
              <Linkedin size={16} />
            </a>
            <a
              href="https://x.com/arthursbuilds"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/50 transition-colors hover:text-foreground/80"
              aria-label="X"
            >
              <SiX size={14} />
            </a>
          </div>
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
                href="/community"
                className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70"
              >
                AppSprint Community
              </Link>
            </li>
            <li>
              <a
                href="https://appsprint.app/aso"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70"
              >
                AppSprint ASO
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-medium text-foreground/80">More</p>
          <ul className="-mx-2 mt-2">
            <li>
              <Link
                href="/about"
                className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70"
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="/share"
                className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70"
              >
                Share Your Story
              </Link>
            </li>
            <li>
              <Link
                href="/partnerships"
                className="inline-block px-2 py-1.5 transition-colors hover:text-foreground/70"
              >
                Partnerships
              </Link>
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
