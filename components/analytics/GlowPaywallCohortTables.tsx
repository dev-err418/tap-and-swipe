"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";
import type { GlowPaywallCohortComparisons } from "@/lib/glow-paywall-cohort-comparisons";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";
import { AppuReadinessIndicator } from "./AppuReadinessIndicator";

const BASE_FLOW_PREVIEWS = {
  standard: {
    title: "Current flow",
    screens: [
      { file: "intro", label: "Free trial introduction" },
      { file: "reminder", label: "Trial reminder" },
      { file: "paywall", label: "Trial timeline & paywall" },
    ],
  },
  versy_reminder: {
    title: "Versy reminder flow",
    screens: [
      { file: "intro", label: "Free trial introduction" },
      { file: "reminder", label: "Reminder timing selection" },
      { file: "paywall", label: "Trial timeline & paywall" },
    ],
  },
} as const;
const preface = [
  { src: "/analytics/glow/paywall-flows/note/testimonials.jpg", label: "Testimonials" },
  { src: "/analytics/glow/paywall-flows/note/team-note.jpg", label: "A note from the team" },
];
const baseScreens = (flow: keyof typeof BASE_FLOW_PREVIEWS) => BASE_FLOW_PREVIEWS[flow].screens.map((screen) => ({
  src: `/analytics/glow/paywall-flows/${flow}/${screen.file}.png`, label: screen.label,
}));
const FLOW_PREVIEWS = {
  standard: { title: "Current flow", screens: baseScreens("standard") },
  standard_note: { title: "Current flow + note", screens: [...preface, ...baseScreens("standard")] },
  versy_reminder: { title: "Versy reminder flow", screens: baseScreens("versy_reminder") },
  versy_reminder_note: { title: "Versy reminder flow + note", screens: [...preface, ...baseScreens("versy_reminder")] },
};

export default function GlowPaywallCohortTables({ report, windowLabel }: {
  report: GlowPaywallCohortComparisons | null;
  windowLabel: string;
}) {
  const [selectedFlow, setSelectedFlow] = useState<keyof typeof FLOW_PREVIEWS | null>(null);
  const [previewGroupsNotes, setPreviewGroupsNotes] = useState(false);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const preview = selectedFlow ? FLOW_PREVIEWS[selectedFlow] : null;
  const openPreview = (key: string, trigger: HTMLButtonElement, groupsNotes = false) => {
    const flow = key.split("|")[0];
    if (!Object.hasOwn(FLOW_PREVIEWS, flow)) return;
    previewTrigger.current = trigger;
    setPreviewGroupsNotes(groupsNotes);
    setSelectedFlow(flow as keyof typeof FLOW_PREVIEWS);
  };
  const previewBaseFlow = selectedFlow === "standard" || selectedFlow === "standard_note" ? "standard" : "versy_reminder";
  const previewNoteFlow = previewBaseFlow === "standard" ? "standard_note" : "versy_reminder_note";

  return <Dialog open={selectedFlow !== null} onOpenChange={(open) => { if (!open) setSelectedFlow(null); }}>
    {([
      { key: "flows", title: "Paywall flows", heading: "Flow" },
      { key: "prices", title: "Yearly prices", heading: "Price" },
      { key: "flowPrices", title: "Paywall flow × yearly price", heading: "Flow × price" },
    ] as const).map(({ key, title, heading }) => {
      const comparison = report?.[key];
      return <DashboardCard key={key} title={title} contentClassName="pt-0"
        titleAccessory={comparison && comparison.status !== "unavailable" ? <AppuReadinessIndicator cohorts={comparison.rows} /> : null}
        action={<span className="text-xs text-muted-foreground">{experimentCohortLabel("glow") ?? windowLabel}</span>}>
        {!comparison || comparison.status === "unavailable"
          ? <p role="status" className="py-2 text-sm text-muted-foreground">{title} reporting is unavailable. Refresh to retry.</p>
          : <>
            {key === "flows" && <p className="pb-2 text-xs text-muted-foreground">Current flow and Versy reminder flow include their previous results. New note variants are shown separately.</p>}
            {key === "flowPrices" && <p className="pb-2 text-xs text-muted-foreground">Includes previous results. Note and no-note variants are combined within each flow.</p>}
            {comparison.warnings.map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
            <JourneyVersionComparison cohorts={comparison.rows} rowLabels={comparison.labels} rowHeading={heading}
              allUsersOnly showAppuComparison showArpuGraph showInstallPaid showRefundRate
              onRowClick={key === "prices" ? undefined : (row, trigger) => openPreview(row, trigger, key === "flowPrices")} />
          </>}
      </DashboardCard>;
    })}
    <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[min(96vw,1000px)]"
      onCloseAutoFocus={(event) => { event.preventDefault(); previewTrigger.current?.focus(); }}>
      <DialogHeader>
        <DialogTitle>{preview?.title}</DialogTitle>
        <DialogDescription>Glow paywall screens, in order. Example shown at $59.99/year.</DialogDescription>
      </DialogHeader>
      {previewGroupsNotes && selectedFlow && <div role="group" aria-label="Preview variant" className="flex gap-2">
        <Button size="sm" variant={selectedFlow === previewBaseFlow ? "default" : "outline"}
          aria-pressed={selectedFlow === previewBaseFlow} onClick={() => setSelectedFlow(previewBaseFlow)}>Without note</Button>
        <Button size="sm" variant={selectedFlow === previewNoteFlow ? "default" : "outline"}
          aria-pressed={selectedFlow === previewNoteFlow} onClick={() => setSelectedFlow(previewNoteFlow)}>With note</Button>
      </div>}
      {preview && selectedFlow ? <ol className="flex min-w-0 gap-4 overflow-x-auto pb-1 scrollbar-none sm:gap-6" aria-label={`${preview.title} screens`}>
        {preview.screens.map((screen, index) => <li key={screen.src} className="w-[min(68vw,260px)] shrink-0">
          <p className="mb-3 text-xs font-medium text-muted-foreground">{index + 1}. {screen.label}</p>
          <Image src={screen.src}
            alt={`${preview.title}, step ${index + 1}: ${screen.label}`} width={368} height={800}
            sizes="280px" className="mx-auto h-[min(65vh,640px)] max-h-[calc(90vh-10rem)] w-auto max-w-full rounded-2xl object-contain" />
        </li>)}
      </ol> : null}
    </DialogContent>
  </Dialog>;
}
