import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import NavbarProfileMenu from "@/components/navbar-profile-menu";

export async function SiteNavbar() {
  const authSession = await auth();
  const discordSession = await getSession();

  const user = authSession?.user;
  const isLoggedIn = !!user || !!discordSession;

  const name =
    user?.name ?? discordSession?.discordUsername ?? null;
  const image =
    user?.image ?? discordSession?.discordAvatar ?? null;
  const avatarUrl =
    image && image.startsWith("http")
      ? image
      : discordSession?.discordAvatar
        ? `https://cdn.discordapp.com/avatars/${discordSession.discordId}/${discordSession.discordAvatar}.png?size=64`
        : null;

  return (
    <nav className="relative z-20 w-full px-6 py-5">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
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
          {isLoggedIn ? (
            <NavbarProfileMenu name={name} avatarUrl={avatarUrl} />
          ) : (
            <Button size="sm" className="rounded-full" asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
