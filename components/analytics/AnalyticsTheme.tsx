"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Monitor, Moon, Sun, SunMoon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DASHBOARD_POPOVER_CLASS, DASHBOARD_POPOVER_ITEM_CLASS } from "./dashboard-surface";

export type AnalyticsAppearance = "system" | "light" | "dark";
const AppearanceContext = createContext<{ appearance: AnalyticsAppearance; setAppearance: (value: AnalyticsAppearance) => void }>({
  appearance: "system", setAppearance: () => {},
});

export function AnalyticsTheme({ initialAppearance, className, children }: {
  initialAppearance: AnalyticsAppearance; className: string; children: ReactNode;
}) {
  const [appearance, setValue] = useState(initialAppearance);
  function setAppearance(value: AnalyticsAppearance) {
    setValue(value);
    document.cookie = `analytics-appearance=${value}; Path=/analytics; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }
  return <AppearanceContext.Provider value={{ appearance, setAppearance }}>
    <div data-analytics-theme={appearance} className={className}>{children}</div>
  </AppearanceContext.Provider>;
}

const options = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export function AnalyticsThemeSetting() {
  const { appearance, setAppearance } = useContext(AppearanceContext);
  return <Select value={appearance} onValueChange={(value) => setAppearance(value as AnalyticsAppearance)}>
    <SelectTrigger aria-label="Appearance" title="Appearance" className="size-10 shrink-0 justify-center rounded-full border-0 bg-card p-0 text-muted-foreground shadow-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[size=default]:h-10 [&>svg:last-child]:hidden">
      <SunMoon className="size-5" aria-hidden="true" />
      <span className="sr-only"><SelectValue /></span>
    </SelectTrigger>
    <SelectContent position="popper" align="end" className={DASHBOARD_POPOVER_CLASS}>
      {options.map(({ value, label, icon: Icon }) => <SelectItem key={value} value={value} className={DASHBOARD_POPOVER_ITEM_CLASS}>
        <span className="flex items-center gap-2"><Icon className="size-4" aria-hidden="true" />{label}</span>
      </SelectItem>)}
    </SelectContent>
  </Select>;
}
