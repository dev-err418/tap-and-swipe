import type { Metadata } from "next";
import Image from "next/image";
import { Youtube, Linkedin } from "lucide-react";
import { SiX } from "@icons-pack/react-simple-icons";

const BASE_URL = "https://tap-and-swipe.com";

export const metadata: Metadata = {
  title: "About Arthur Spalanzani — Tap & Swipe",
  description:
    "I'm Arthur. I'm 22, French, and I build mobile apps. Learn about my journey from freelancing to building a portfolio of apps hitting 12K EUR MRR.",
  openGraph: {
    title: "About Arthur Spalanzani — Tap & Swipe",
    description:
      "I'm Arthur. I'm 22, French, and I build mobile apps. Learn about my journey from freelancing to building a portfolio of apps hitting 12K EUR MRR.",
    url: `${BASE_URL}/about`,
  },
  twitter: {
    title: "About Arthur Spalanzani — Tap & Swipe",
    description:
      "I'm Arthur. I'm 22, French, and I build mobile apps. Learn about my journey from freelancing to building a portfolio of apps hitting 12K EUR MRR.",
  },
  alternates: {
    canonical: "/about",
  },
};

const socials = [
  {
    label: "YouTube",
    href: "https://www.youtube.com/@ArthurBuildsStuff",
    icon: Youtube,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/arthur-spalanzani/",
    icon: Linkedin,
  },
  {
    label: "X",
    href: "https://x.com/arthursbuilds",
    icon: SiX,
  },
] as const;

function buildJsonLd() {
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Arthur Spalanzani",
    alternateName: ["ArthurBuildsStuff", "Arthur Builds Stuff"],
    url: BASE_URL,
    image:
      "https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj",
    jobTitle: "Founder",
    description:
      "French indie app maker, YouTuber, and founder of Tap & Swipe. Builds mobile apps and helps others do the same.",
    nationality: { "@type": "Country", name: "France" },
    knowsAbout: [
      "Mobile app development",
      "iOS development",
      "React Native",
      "App Store Optimization",
      "Indie app business",
    ],
    sameAs: [
      "https://www.youtube.com/@ArthurBuildsStuff",
      "https://www.linkedin.com/in/arthur-spalanzani/",
      "https://x.com/arthursbuilds",
    ],
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "About",
        item: `${BASE_URL}/about`,
      },
    ],
  };

  return [person, breadcrumb];
}

export default function AboutPage() {
  const jsonLd = buildJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto w-full max-w-3xl px-6 py-20">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <Image
            src="https://yt3.googleusercontent.com/8G2AIp9fMdSdZDw1IrGEZM9-Jf6CDjt5xyNFGqK1885tfO-DdQ8rIJNbBZoQ_1esZ-NjMRdmd2U=s160-c-k-c0x00ffffff-no-rj"
            alt="Arthur Spalanzani"
            width={96}
            height={96}
            className="rounded-full"
          />
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
            Arthur Spalanzani
          </h1>
          <p className="mt-1 text-muted-foreground">Building Tap & Swipe</p>

          <div className="mt-4 flex items-center gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="me noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label={s.label}
              >
                <s.icon size={18} />
              </a>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="mt-16 space-y-10 text-[15px] leading-relaxed text-foreground/70">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              The early days
            </h2>
            <p>
              I&apos;m Arthur, I&apos;m{" "}
              {Math.floor(
                (Date.now() - new Date("2004-10-08").getTime()) /
                  (365.25 * 24 * 60 * 60 * 1000)
              )}{" "}
              and I build cool stuff :)
            </p>
            <p className="mt-4">
              I started programming as a teenager, alone in my room, just
              because I liked learning how things worked. At some point I
              realized people would pay me to build stuff, so I started
              freelancing. The day I turned 18, I registered my first business
              with my best friend from uni, Jérémie. We ran a small agency building SaaS and
              mobile apps for clients. It paid well. The business grew, we had
              a small local office and three friends working with us.
            </p>
            <figure className="mt-6">
              <Image
                src="/arthur-agency.webp"
                alt="Arthur and his team at their agency office"
                width={2000}
                height={2000}
                className="mx-auto w-full max-w-md rounded-xl"
              />
              <figcaption className="mt-2 text-center text-xs italic text-muted-foreground">
                The team at our little office
              </figcaption>
            </figure>
            <p className="mt-4">
              But we were building other people&apos;s products, and after a
              while that felt empty.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              The startup detour
            </h2>
            <p>
              So we pivoted. At the agency, we&apos;d built a proprietary
              embedding model specialized for French medical language. We sold
              it as innovation, got government funding for it. Then we partnered
              with two doctors and reused that same technology to launch an AI
              healthcare startup. I went through the whole ecosystem. Funds,
              incubators, business angels. I hated most of it. A lot of theory,
              not enough building. A lot of meetings about meetings.
            </p>
            <figure className="mt-6">
              <Image
                src="/arthur-jeremie.webp"
                alt="Jérémie and Arthur in shirts at their startup"
                width={2000}
                height={2000}
                className="mx-auto w-full max-w-md rounded-xl"
              />
              <figcaption className="mt-2 text-center text-xs italic text-muted-foreground">
                Jérémie & me. Shirts to
                look classy, but no idea how to build something truly profitable.
              </figcaption>
            </figure>
            <p className="mt-4">
              Then my cofounder, Jérémie, left for personal reasons. He was
              the guy I started with, in the agency and in the medical company. Out of
              loyalty, I left too.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              The turn
            </h2>
            <p>
              That&apos;s when everything changed. I decided I was done with the
              startup theater. No more pitch decks, no more incubators. I wanted
              to generate actual revenue. Every day. So I went all in on mobile
              apps. I&apos;d worked on one during the medical startup and loved
              building it. AI was blowing up at the same time, so the timing
              made sense.
            </p>
            <p className="mt-4">
              I launched my YouTube channel, Arthur Builds Stuff, to document
              what I was learning. Got 20,000 subscribers in three videos, which
              told me people cared about this stuff. I built a small portfolio of
              apps that hit $12K MRR at its peak. Launched an ASO tool
              to help other builders grow their apps ($5K MRR). Started a
              private community of mobile app builders that I genuinely love
              running.
            </p>
            <figure className="mt-6">
              <Image
                src="/arthur-youtube.webp"
                alt="Arthur Builds Stuff YouTube channel"
                width={529}
                height={204}
                className="mx-auto w-full max-w-md rounded-xl"
              />
              <figcaption className="mt-2 text-center text-xs italic text-muted-foreground">
                20K subs in 3 videos, not bad
              </figcaption>
            </figure>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              Why Tap & Swipe
            </h2>
            <p>
              But the thing I kept noticing was this: every time I met another
              app builder, the conversation was always better than any content I
              could make alone. The stories were wild. People building
              $20K/month apps on the side of their day job. People who failed
              five times before something worked. People who made zero money but
              had 50,000 users who loved their product.
            </p>
            <p className="mt-4">
              There was this show I watched a lot, Starter Story by Pat Walls. I
              liked it, but it was always about the money. How much MRR, how
              fast, what&apos;s the playbook. And sometimes the most interesting
              part is the story behind the numbers. Why someone built what they
              built. The job they were trying to escape. The pivot that almost
              killed them. The thing they learned that changed how they think
              about building.
            </p>
            <p className="mt-4">
              Pat never invited me on his show, so I started my own. (just kidding Pat)
            </p>
            <figure className="mt-6">
              <Image
                src="/arthur-podcast.webp"
                alt="Arthur recording Tap & Swipe"
                width={2000}
                height={2000}
                className="mx-auto w-full max-w-md rounded-xl"
              />
              <figcaption className="mt-2 text-center text-xs italic text-muted-foreground">
                First recording, just bought that new mic hehe
              </figcaption>
            </figure>
            <p className="mt-4">
              That&apos;s Tap & Swipe. Mobile app builders sharing the real
              story behind their apps. The idea, the code, the growth, the
              money, and everything that went wrong in between.
            </p>
            <p className="mt-4">
              If you build apps, or want to, you&apos;re in the right place.
            </p>
          </section>
        </div>

      </div>
    </>
  );
}
