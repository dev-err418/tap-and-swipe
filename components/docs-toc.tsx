"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { TocItem } from "@/lib/toc";
import { cn } from "@/lib/utils";

interface DocsTocProps {
  items: TocItem[];
}

const SCROLL_OFFSET = 100;

export function DocsToc({ items }: DocsTocProps) {
  const [activeId, setActiveId] = useState<string>("");
  const isClickScrolling = useRef(false);
  const itemRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [indicator, setIndicator] = useState<{ top: number; height: number }>({
    top: 0,
    height: 0,
  });

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

  // Update indicator position based on the active item's actual DOM rect
  useEffect(() => {
    if (!activeId) return;
    const el = itemRefs.current.get(activeId);
    if (!el) return;
    const container = el.parentElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicator({
      top: elRect.top - containerRect.top,
      height: elRect.height,
    });
  }, [activeId]);

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

  if (items.length === 0) return null;

  return (
    <nav>
      <p className="mt-0 mb-3 text-xs font-medium text-muted-foreground">
        On this page
      </p>
      <div className="relative">
        {/* Track */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />

        {/* Active indicator */}
        {activeId && (
          <div
            className="absolute left-0 w-px bg-foreground transition-all duration-200 ease-out"
            style={{
              top: `${indicator.top}px`,
              height: `${indicator.height}px`,
            }}
          />
        )}

        {/* Items */}
        <div className="flex flex-col">
          {items.map((item) => (
            <a
              key={item.id}
              ref={(el) => {
                if (el) itemRefs.current.set(item.id, el);
              }}
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className={cn(
                "py-1 text-xs leading-snug transition-colors hover:text-foreground",
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
