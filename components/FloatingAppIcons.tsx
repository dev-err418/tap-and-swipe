"use client";

import { motion } from "framer-motion";

type IconPosition = {
  left?: string;
  right?: string;
  top: string;
  size: number;
  rotate: number;
  icon: string;
};

const DEFAULT_POSITIONS: Omit<IconPosition, "icon">[] = [
  // Left col 1
  { left: "5%", top: "8%", size: 64, rotate: -12 },
  { left: "4%", top: "40%", size: 56, rotate: 8 },
  { left: "2%", top: "62%", size: 48, rotate: -18 },
  { left: "4%", top: "82%", size: 56, rotate: 6 },
  // Left col 2
  { left: "13%", top: "5%", size: 48, rotate: 15 },
  { left: "14%", top: "35%", size: 40, rotate: -10 },
  { left: "13%", top: "70%", size: 48, rotate: 20 },
  // Right col 1
  { right: "13%", top: "4%", size: 56, rotate: 12 },
  { right: "12%", top: "42%", size: 40, rotate: -14 },
  { right: "13%", top: "68%", size: 48, rotate: 18 },
  // Right col 2
  { right: "4%", top: "10%", size: 48, rotate: -8 },
  { right: "3%", top: "38%", size: 64, rotate: 10 },
  { right: "2%", top: "65%", size: 56, rotate: -16 },
  { right: "5%", top: "85%", size: 40, rotate: 22 },
];

const DEFAULT_ICONS = [
  "/app-icons/01.webp",
  "/app-icons/02.webp",
  "/app-icons/03.webp",
  "/app-icons/04.webp",
  "/app-icons/05.webp",
  "/app-icons/06.webp",
  "/app-icons/07.webp",
  "/app-icons/08.webp",
  "/app-icons/09.webp",
  "/app-icons/10.webp",
  "/app-icons/11.webp",
  "/app-icons/12.webp",
  "/app-icons/13.webp",
  "/app-icons/14.webp",
];

const EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

function FloatingIcon({
  icon,
  index,
}: {
  icon: IconPosition;
  index: number;
}) {
  const isLeft = "left" in icon && icon.left;
  const posStyle = {
    ...(isLeft ? { left: icon.left } : { right: icon.right }),
    top: icon.top,
  };
  const delay = 0.1 + (parseFloat(icon.top) / 100) * 0.5;

  return (
    <motion.div
      className="absolute"
      style={posStyle}
      animate={{ y: [0, index % 2 === 0 ? -10 : 10, 0] }}
      transition={{
        y: {
          duration: 5 + (index % 3),
          delay: 0.8 + index * 0.04,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "reverse",
        },
      }}
    >
      <motion.img
        src={icon.icon}
        alt=""
        className="rounded-[22%] shadow-lg"
        loading="lazy"
        style={{ width: icon.size, height: icon.size }}
        initial={{ opacity: 0, scale: 0.8, rotate: icon.rotate }}
        animate={{ opacity: 1, scale: 1, rotate: icon.rotate }}
        transition={{
          opacity: { duration: 0.6, delay, ease: EASE },
          scale: { duration: 0.6, delay, ease: EASE },
        }}
      />
    </motion.div>
  );
}

export function FloatingAppIcons({ icons, label, hideStrip }: { icons?: string[]; label?: string; hideStrip?: boolean }) {
  const iconUrls = icons ?? DEFAULT_ICONS;
  const items: IconPosition[] = iconUrls.map((url, i) => ({
    ...DEFAULT_POSITIONS[i % DEFAULT_POSITIONS.length],
    icon: url,
  }));

  return (
    <>
      {/* Scattered icons (xl+) */}
      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden xl:block" aria-hidden="true">
        {items.map((icon, i) => (
          <FloatingIcon key={i} icon={icon} index={i} />
        ))}

        {/* Handwritten label with arrow */}
        {label && (
          <motion.div
            className="absolute"
            style={{ right: "12%", bottom: "12%" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, -6, 0] }}
            transition={{
              opacity: { duration: 0.8, delay: 1.2 },
              y: { duration: 4, delay: 1.2, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" },
            }}
          >
            <div className="flex flex-col items-end">
              <img src="/community-icons/arrow.png" alt="" width={40} height={40} loading="lazy" className="w-10 h-10 opacity-25 rotate-12 -scale-x-100 -mb-1 mr-2" />
              <span className="text-sm text-black/40 italic -rotate-[8deg] whitespace-nowrap mr-8">{label}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Icon strip (below xl) */}
      {!hideStrip && <div className="pointer-events-none flex gap-3 mb-8 xl:hidden" aria-hidden="true">
        {items.slice(0, 7).map((icon, i) => (
          <motion.img
            key={i}
            src={icon.icon}
            alt=""
            className="rounded-[22%] shadow-md"
            loading="lazy"
            style={{ width: 40, height: 40 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              opacity: { duration: 0.5, delay: 0.1 + i * 0.05, ease: EASE },
              scale: { duration: 0.5, delay: 0.1 + i * 0.05, ease: EASE },
            }}
          />
        ))}
      </div>}
    </>
  );
}
