"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";
import type { PokyPaywallFlowComparison } from "@/lib/poky-paywall-flow-cohorts";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";
import { AppuReadinessIndicator } from "./AppuReadinessIndicator";

const FLOW_PREVIEWS = {
  current: {
    title: "HP (hard paywall)",
    description: "Poky’s regular paywall. Example shown with yearly and weekly plans.",
    screens: [{ file: "paywall", label: "Choose your plan" }],
  },
  trial: {
    title: "3-day trial",
    description: "Poky’s trial flow, in order: introduction, reminder timing, then the trial paywall.",
    screens: [
      { file: "intro", label: "Free trial introduction" },
      { file: "reminder", label: "Reminder timing selection" },
      { file: "paywall", label: "3-day trial paywall" },
    ],
  },
  trial_7d: {
    title: "7-day trial · current",
    description: "Poky’s 7-day flow: free trial introduction, dated reminder, then the trial timeline and yearly paywall.",
    screens: [
      { file: "intro", label: "Free trial introduction" },
      { file: "reminder", label: "Trial reminder introduction" },
      { file: "paywall", label: "7-day trial timeline and paywall" },
    ],
  },
  trial_7d_mascot: {
    title: "7-day trial · mascot",
    description: "Poky introduces the seven-day trial and reminder in speech bubbles, followed by the same trial timeline and yearly paywall.",
    screens: [
      { file: "intro", label: "Mascot trial introduction" },
      { file: "reminder", label: "Mascot trial reminder" },
      { file: "paywall", label: "7-day trial timeline and paywall" },
    ],
  },
} as const;

export default function PokyPaywallFlowTable({ report, windowLabel }: { report: PokyPaywallFlowComparison | null; windowLabel: string }) {
  const [selectedFlow, setSelectedFlow] = useState<keyof typeof FLOW_PREVIEWS | null>(null);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const preview = selectedFlow ? FLOW_PREVIEWS[selectedFlow] : null;
  return <Dialog open={selectedFlow !== null} onOpenChange={(open) => { if (!open) setSelectedFlow(null); }}>
    {[{ comparison: report, title: "Paywall flows" },
      ...(report?.previous ? [{ comparison: report.previous, title: "Previous paywall flows · 25/25/50" }] : []),
      ...(report?.legacy ? [{ comparison: report.legacy, title: "Previous paywall flows · 50/50" }] : []),
    ].map(({ comparison, title }, index) => <DashboardCard key={title} title={title} contentClassName="pt-0"
    titleAccessory={comparison && comparison.status !== "unavailable" ? <AppuReadinessIndicator cohorts={comparison.rows} /> : null}
    action={<span className="text-xs text-muted-foreground">{experimentCohortLabel("poky") ?? windowLabel}</span>}>
    {!comparison || comparison.status === "unavailable"
      ? <p role="status" className="py-2 text-sm text-muted-foreground">Paywall flow reporting is unavailable. Refresh to retry.</p>
      : <>
        {!index ? <p className="pb-2 text-xs text-muted-foreground">HP 25% · 3-day trial 25% · 7-day current 25% · 7-day mascot 25%{comparison.status === "empty" ? " · Waiting for new assignments" : ""}</p> : null}
        {comparison.warnings.map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
        <JourneyVersionComparison cohorts={comparison.rows} rowLabels={comparison.labels} rowHeading="Paywall flow"
          allUsersOnly showAppuComparison showArpuGraph showInstallPaid showRefundRate
          onRowClick={(key, trigger) => {
            if (key !== "current" && key !== "trial" && key !== "trial_7d" && key !== "trial_7d_mascot") return;
            previewTrigger.current = trigger;
            setSelectedFlow(key);
          }} />
      </>}
    </DashboardCard>)}
    <DialogContent className={`max-h-[90vh] overflow-y-auto rounded-2xl ${selectedFlow !== "current" ? "sm:max-w-[min(96vw,1000px)]" : "sm:max-w-md"}`}
      onCloseAutoFocus={(event) => { event.preventDefault(); previewTrigger.current?.focus(); }}>
      <DialogHeader>
        <DialogTitle>{preview?.title}</DialogTitle>
        <DialogDescription>{preview?.description}</DialogDescription>
      </DialogHeader>
      {preview && selectedFlow ? <ol className="flex min-w-0 gap-4 overflow-x-auto pb-1 scrollbar-none sm:gap-6" aria-label={`${preview.title} screens`}>
        {preview.screens.map((screen, index) => <li key={screen.file} className="w-[min(68vw,260px)] shrink-0 sm:w-0 sm:flex-1">
          {preview.screens.length > 1 ? <p className="mb-3 text-xs font-medium text-muted-foreground">{index + 1}. {screen.label}</p> : null}
          <Image src={`/analytics/poky/paywall-flows/${selectedFlow}/${screen.file}.${selectedFlow.startsWith("trial_7d") ? "jpg" : "png"}`}
            alt={`Poky ${preview.title}, step ${index + 1}: ${screen.label}`} width={368} height={800} sizes="320px"
            className="mx-auto h-[min(65vh,640px)] max-h-[calc(90vh-10rem)] w-auto max-w-full rounded-2xl object-contain" />
        </li>)}
      </ol> : null}
    </DialogContent>
  </Dialog>;
}
