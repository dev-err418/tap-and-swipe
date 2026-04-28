"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINK_CLASS =
  "inline-block px-2 py-1.5 transition-colors hover:text-foreground/70";

export function FooterLegalLinks() {
  const pathname = usePathname();
  const isCommunity = pathname?.startsWith("/community");

  if (isCommunity) {
    return (
      <ul className="-mx-2 mt-2">
        <li>
          <Link href="/community/tos" className={LINK_CLASS}>
            Terms of Service
          </Link>
        </li>
        <li>
          <Link href="/community/privacy" className={LINK_CLASS}>
            Privacy Policy
          </Link>
        </li>
        <li>
          <Link href="/community/refund" className={LINK_CLASS}>
            Refund Policy
          </Link>
        </li>
      </ul>
    );
  }

  return (
    <ul className="-mx-2 mt-2">
      <li>
        <Link href="/privacy" className={LINK_CLASS}>
          Privacy Policy
        </Link>
      </li>
    </ul>
  );
}
