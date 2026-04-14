"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { TocItem } from "@/lib/toc";
import { cn } from "@/lib/utils";

interface DocsTocProps {
  items: TocItem[];
}

const SCROLL_OFFSET = 100;

export function DocsToc({ items }: DocsTocProps) {
  const [activeId, setActiveId] = useState<string>("");
  const isClickScrolling = useRef(false);

  const getActiveId = useCallback(() => {
    const ids = items.map((item) => item.id);
    if (ids.length === 0) return "";

    let current = "";
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.getBoundingClientRect().top <= SCROLL_OFFSET) {
        current = id;
      } else {
        break;
      }
    }

    if (!current && ids.length > 0) {
      return ids[0];
    }

    return current;
  }, [items]);

  useEffect(() => {
    const onScroll = () => {
      if (isClickScrolling.current) return;
      setActiveId(getActiveId());
    };

    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [getActiveId]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, itemId: string) => {
      e.preventDefault();

      const element = document.getElementById(itemId);
      if (!element) return;

      setActiveId(itemId);
      isClickScrolling.current = true;

      element.scrollIntoView({ behavior: "smooth", block: "start" });

      let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

      const clearFlag = () => {
        isClickScrolling.current = false;
        clearTimeout(fallbackTimer);
      };

      if ("onscrollend" in window) {
        window.addEventListener("scrollend", clearFlag, { once: true });
        fallbackTimer = setTimeout(() => {
          window.removeEventListener("scrollend", clearFlag);
          isClickScrolling.current = false;
        }, 800);
      } else {
        fallbackTimer = setTimeout(() => {
          isClickScrolling.current = false;
        }, 800);
      }
    },
    [],
  );

  const activeIndex = useMemo(
    () => items.findIndex((item) => item.id === activeId),
    [items, activeId],
  );

  if (items.length === 0) return null;

  return (
    <nav>
      <p className="mb-3 text-xs font-medium text-muted-foreground">
        On this page
      </p>
      <div className="relative">
        {/* Track */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />

        {/* Active indicator */}
        {activeIndex >= 0 && (
          <div
            className="absolute left-0 w-px bg-foreground transition-all duration-200 ease-out"
            style={{
              top: `${activeIndex * 28}px`,
              height: "28px",
            }}
          />
        )}

        {/* Items */}
        <div className="flex flex-col">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className={cn(
                "flex h-7 items-center text-xs transition-colors hover:text-foreground",
                item.level === 3 ? "pl-6" : "pl-3",
                activeId === item.id
                  ? "font-medium text-foreground"
                  : "text-muted-foreground/70",
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
