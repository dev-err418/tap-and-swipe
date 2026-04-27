import Link from "next/link";
import { getSession } from "@/lib/session";
import NavbarProfileMenu from "@/components/navbar-profile-menu";

export async function SiteNavbar() {
  const session = await getSession();

  const isLoggedIn = !!session;

  const name = session?.discordUsername ?? null;
  const avatarUrl = session?.discordAvatar
    ? `https://cdn.discordapp.com/avatars/${session.discordId}/${session.discordAvatar}.png?size=64`
    : null;

  return (
    <nav className="relative z-20 w-full px-6 py-5">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <Link href="/" className="flex items-center">
          <img
            src="/logo-mark.png"
            alt=""
            width={24}
            height={24}
            className="h-6 w-6"
          />
          <span className="text-sm font-semibold italic tracking-[-0.03em] text-foreground/90">
            Tap &amp; Swipe
          </span>
          <span className="hidden text-sm text-muted-foreground sm:ml-2.5 sm:inline">
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
          {isLoggedIn && (
            <Link
              href="/learn"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground/70"
            >
              Learn
            </Link>
          )}
          {isLoggedIn && (
            <NavbarProfileMenu name={name} avatarUrl={avatarUrl} />
          )}
        </div>
      </div>
    </nav>
  );
}
