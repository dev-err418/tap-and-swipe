"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function AdminStarterPreviewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isPreviewing = searchParams.get("preview") === "starter";

  const toggle = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (isPreviewing) {
      params.delete("preview");
    } else {
      params.set("preview", "starter");
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams, isPreviewing]);

  return (
    <button
      type="button"
      onClick={toggle}
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-all ${
        isPreviewing
          ? "bg-[#FF9500] text-white hover:bg-[#FF9500]/85"
          : "bg-black text-white hover:bg-black/85"
      }`}
      aria-label="Toggle starter preview"
    >
      {isPreviewing ? (
        <>
          <EyeOff className="h-4 w-4" />
          Exit starter preview
        </>
      ) : (
        <>
          <Eye className="h-4 w-4" />
          Preview as starter
        </>
      )}
    </button>
  );
}
