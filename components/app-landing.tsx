import Image from "next/image";

type AppLandingProps = {
  name: string;
  tagline: string;
  description: string;
  iconUrl: string;
  appStoreUrl: string;
  playStoreUrl?: string;
  rating?: number;
  ratingCount?: number;
  features: { title: string; description: string }[];
  screenshots?: string[];
  tint: {
    bg: string;
    accent: string;
    text: string;
    muted: string;
    buttonBg: string;
    buttonRing: string;
  };
  legal: {
    privacyUrl: string;
    termsUrl: string;
    supportUrl: string;
  };
};

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const fill =
      rating >= i ? 1 : rating >= i - 0.5 ? 0.5 : 0;
    stars.push(
      <svg
        key={i}
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        {fill === 1 ? (
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        ) : fill === 0.5 ? (
          <>
            <defs>
              <linearGradient id={`half-${i}`}>
                <stop offset="50%" stopColor="currentColor" />
                <stop offset="50%" stopColor="currentColor" stopOpacity="0.25" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#half-${i})`}
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </>
        ) : (
          <path
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            opacity="0.25"
          />
        )}
      </svg>
    );
  }
  return <div className="flex gap-0.5">{stars}</div>;
}

export default function AppLandingPage({
  name,
  tagline,
  description,
  iconUrl,
  appStoreUrl,
  playStoreUrl,
  rating,
  ratingCount,
  features,
  screenshots,
  tint,
  legal,
}: AppLandingProps) {
  return (
    <main
      className="relative z-10 flex min-h-screen flex-col items-center px-4 py-12 sm:py-16"
      style={{ backgroundColor: "#ffffff", color: tint.text }}
    >
      {/* Hero */}
      <section className="flex w-full max-w-2xl flex-col items-center pt-8 text-center sm:pt-16">
        <Image
          src={iconUrl}
          alt={`${name} app icon`}
          width={80}
          height={80}
          className="rounded-[18px] shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
        />

        <h1
          className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl"
          style={{ color: tint.accent }}
        >
          {name}
        </h1>

        <p className="mt-3 text-lg font-medium sm:text-xl" style={{ color: tint.text }}>
          {tagline}
        </p>

        {/* Rating */}
        {rating != null && ratingCount != null && (
          <div className="mt-4 flex items-center gap-2" style={{ color: tint.accent }}>
            <StarRating rating={rating} />
            <span className="text-sm font-medium" style={{ color: tint.muted }}>
              {rating.toFixed(1)} out of 5 ({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})
            </span>
          </div>
        )}

        {/* Download buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-14 items-center justify-center rounded-full px-8 text-base font-semibold text-white transition-all hover:opacity-90 hover:ring-4"
            style={{
              backgroundColor: tint.buttonBg,
              // @ts-expect-error custom hover ring
              "--tw-ring-color": tint.buttonRing,
            }}
          >
            <Image src="/apple.svg" alt="" width={18} height={18} className="mr-2.5 brightness-0 invert" />
            App Store
          </a>

          {playStoreUrl && (
            <a
              href={playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-14 items-center justify-center rounded-full px-8 text-base font-semibold text-white transition-all hover:opacity-90 hover:ring-4"
              style={{
                backgroundColor: tint.buttonBg,
                // @ts-expect-error custom hover ring
                "--tw-ring-color": tint.buttonRing,
              }}
            >
              <Image src="/android.svg" alt="" width={18} height={18} className="mr-2.5 brightness-0 invert" />
              Google Play
            </a>
          )}
        </div>
      </section>

      {/* Description */}
      <section className="mt-16 w-full max-w-3xl sm:mt-20">
        <h2
          className="text-2xl font-bold tracking-tight sm:text-3xl"
          style={{ color: tint.text }}
        >
          Description
        </h2>
        <p className="mt-4 text-base leading-relaxed" style={{ color: tint.muted }}>
          {description}
        </p>
      </section>

      {/* Screenshots */}
      {screenshots && screenshots.length > 0 && (
        <section className="mt-20 w-full max-w-3xl sm:mt-24">
          <h2
            className="text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: tint.text }}
          >
            Screenshots
          </h2>
          <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
            {screenshots.map((src) => (
              <Image
                key={src}
                src={src}
                alt={`${name} screenshot`}
                width={200}
                height={400}
                className="flex-none rounded-2xl shadow-md"
              />
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      {features.length > 0 && (
        <section className="mt-20 w-full max-w-3xl sm:mt-24">
          <h2
            className="text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: tint.text }}
          >
            What you can do with {name}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-black/10 bg-black/[0.02] p-6 transition-all hover:bg-black/[0.04]"
              >
                <h3 className="text-lg font-semibold" style={{ color: tint.text }}>
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: tint.muted }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-20 w-full text-center text-sm sm:mt-24" style={{ color: tint.muted }}>
        <p className="font-semibold" style={{ color: tint.text }}>
          TAP &amp; SWIPE
        </p>
        <p className="mt-1">
          <a href={legal.privacyUrl} className="underline hover:opacity-70">
            Privacy
          </a>
          {" · "}
          <a href={legal.termsUrl} className="underline hover:opacity-70">
            Terms
          </a>
          {" · "}
          <a href={legal.supportUrl} className="underline hover:opacity-70">
            Support
          </a>
        </p>
      </footer>
    </main>
  );
}
