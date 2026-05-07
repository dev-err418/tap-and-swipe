import { Linkedin } from "lucide-react";
import { SiYoutube, SiInstagram } from "@icons-pack/react-simple-icons";
import PageTracker from "./PageTracker";
import { SubscribeForm } from "./SubscribeForm";
import { HeroMobileMarquee } from "./hero-mobile-icons";

const SOCIAL_BADGES = [
  {
    label: "@arthurspalanzani",
    href: "https://www.youtube.com/@arthurspalanzani",
    Icon: SiYoutube,
    color: "#FF0000",
  },
  {
    label: "@arthurspalanzani",
    href: "https://www.instagram.com/arthurspalanzani",
    Icon: SiInstagram,
    color: "#FF0069",
  },
  {
    label: "@arthurspalanzani",
    href: "https://www.linkedin.com/in/arthur-spalanzani/",
    Icon: Linkedin,
    color: "#0A66C2",
  },
] as const;

type HeroIcon = {
  top: string;
  size: number;
  rotate: number;
  icon: string;
  left?: string;
  right?: string;
};

const HERO_ICON_POSITIONS: HeroIcon[] = [
  { left: "5%", top: "8%", size: 64, rotate: -12, icon: "/app-icons/01.webp" },
  { left: "4%", top: "40%", size: 56, rotate: 8, icon: "/app-icons/02.webp" },
  { left: "2%", top: "62%", size: 48, rotate: -18, icon: "/app-icons/03.webp" },
  { left: "4%", top: "82%", size: 56, rotate: 6, icon: "/app-icons/04.webp" },
  { left: "13%", top: "5%", size: 48, rotate: 15, icon: "/app-icons/05.webp" },
  { left: "14%", top: "35%", size: 40, rotate: -10, icon: "/app-icons/06.webp" },
  { left: "13%", top: "70%", size: 48, rotate: 20, icon: "/app-icons/07.webp" },
  { right: "13%", top: "4%", size: 56, rotate: 12, icon: "/app-icons/08.webp" },
  { right: "12%", top: "42%", size: 40, rotate: -14, icon: "/app-icons/09.webp" },
  { right: "13%", top: "68%", size: 48, rotate: 18, icon: "/app-icons/10.webp" },
  { right: "4%", top: "10%", size: 48, rotate: -8, icon: "/app-icons/11.webp" },
  { right: "3%", top: "38%", size: 64, rotate: 10, icon: "/app-icons/12.webp" },
  { right: "2%", top: "65%", size: 56, rotate: -16, icon: "/app-icons/13.webp" },
  { right: "5%", top: "85%", size: 40, rotate: 22, icon: "/app-icons/14.webp" },
];

export function Hero({ showSubscribe = true }: { showSubscribe?: boolean }) {
  return (
    <section
      className="relative flex min-h-[600px] flex-1 flex-col items-center justify-center px-6 text-center"
      style={{ minHeight: "max(600px, calc(100dvh - 72px))" }}
    >
      <PageTracker product="home" />
      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden xl:block" aria-hidden="true">
        {HERO_ICON_POSITIONS.map((icon) => (
          <img
            key={icon.icon}
            src={icon.icon}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute rounded-[22%] shadow-lg opacity-95"
            style={{
              ...(icon.left ? { left: icon.left } : { right: icon.right }),
              top: icon.top,
              width: icon.size,
              height: icon.size,
              transform: `rotate(${icon.rotate}deg)`,
            }}
          />
        ))}
      </div>

      <HeroMobileMarquee />

      <div className="relative z-10">
        <h1 className="max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
          I build mobile apps, and I talk to people who do too.
        </h1>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 fade-in-up" style={{ animationDelay: "0.1s" }}>
          {SOCIAL_BADGES.map(({ label, href, Icon, color }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground [&>svg]:size-3"
            >
              <Icon color={color} />
              {label}
            </a>
          ))}
        </div>

        <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
          <p className="mt-6 mx-auto max-w-xl text-base text-black/60 sm:text-lg">
            One founder breakdown a week, plus everything I&apos;m learning building.
          </p>
        </div>

        {showSubscribe && (
          <div className="fade-in-up" style={{ animationDelay: "0.35s" }}>
            <SubscribeForm />
          </div>
        )}
      </div>
    </section>
  );
}
