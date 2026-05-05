const ICONS = Array.from(
  { length: 14 },
  (_, i) => `/app-icons/${String(i + 1).padStart(2, "0")}.webp`,
);

// Marquee strip: continuous horizontal scroll above the headline. Mounted as
// a flex sibling of the inner content wrapper so its w-screen track can't
// inflate the wrapper's intrinsic width and break the subtitle's padding.
// overflow-x-clip + py-3 keep horizontal clipping while letting rotated
// edges and shadows breathe vertically.
export function HeroMobileMarquee() {
  const row = [...ICONS, ...ICONS]; // duplicated for seamless loop
  return (
    <div
      className="mb-8 w-screen overflow-x-clip py-3 xl:hidden"
      aria-hidden="true"
    >
      <div className="marquee-left flex w-max gap-3">
        {row.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-12 w-12 shrink-0 rounded-[22%] shadow-md"
            style={{ transform: `rotate(${((i % 3) - 1) * 4}deg)` }}
          />
        ))}
      </div>
    </div>
  );
}
