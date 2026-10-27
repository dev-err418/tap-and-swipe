"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";
import type { PokyPaywallFlowComparison } from "@/lib/poky-paywall-flow-cohorts";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";
import { AppuReadinessIndicator } from "./AppuReadinessIndicator";
import { POKY_NOTE_FLOWS } from "@/lib/poky-paywall-note";

const BASE_FLOW_PREVIEWS = {
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

type BaseFlow = keyof typeof BASE_FLOW_PREVIEWS;
type Flow = BaseFlow | `${BaseFlow}_note`;
function previewFor(flow: Flow) {
  const withNote = flow.endsWith("_note");
  const base = (withNote ? flow.slice(0, -5) : flow) as BaseFlow;
  const preview = BASE_FLOW_PREVIEWS[base];
  return { title: preview.title + (withNote ? " + note" : ""),
    description: withNote ? `A note from the Poky team, then ${preview.description}` : preview.description,
    screens: [
      ...(withNote ? [{ src: "/analytics/poky/paywall-flows/note/team-note.jpg", label: "A note from the team" }] : []),
      ...preview.screens.map((screen) => ({ label: screen.label,
        src: `/analytics/poky/paywall-flows/${base}/${screen.file}.${base.startsWith("trial_7d") ? "jpg" : "png"}` })),
    ] };
}

export default function PokyPaywallFlowTable({ report, windowLabel }: { report: PokyPaywallFlowComparison | null; windowLabel: string }) {
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const preview = selectedFlow ? previewFor(selectedFlow) : null;
  const note = report?.noteExperiment;
  const openPreview = (key: string, trigger: HTMLButtonElement) => {
    const base = key.endsWith("_note") ? key.slice(0, -5) : key;
    if (!(base in BASE_FLOW_PREVIEWS)) return;
    previewTrigger.current = trigger;
    setSelectedFlow(key as Flow);
  };
  return <Dialog open={selectedFlow !== null} onOpenChange={(open) => { if (!open) setSelectedFlow(null); }}>
    {note ? <DashboardCard title="Team note A/B test" contentClassName="pt-0">
      <p className="pb-2 text-xs text-muted-foreground">80% with the note · 20% original flow · Same split within each offer{note.overall.status === "empty" ? " · Waiting for the updated app" : ""}</p>
      {note.overall.warnings.map((warning) => <p key={warning} role="status" className="text-xs text-muted-foreground">{warning}</p>)}
      <JourneyVersionComparison cohorts={note.overall.rows} rowLabels={note.overall.labels} rowHeading="Note treatment"
        allUsersOnly showAppuComparison showArpuGraph showInstallPaid showRefundRate />
      <p className="mt-2 text-xs text-muted-foreground">Note seen: {note.reached.note.note} · Continued: {note.reached.note.continued} · Reached paywall: {note.reached.note.paywall}</p>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium">Compare note variants within each paywall flow</summary>
        {POKY_NOTE_FLOWS.map(({ key, label }) => <section key={key} className="mt-4">
          <h3 className="mb-2 text-sm font-medium">{label}</h3>
          <JourneyVersionComparison cohorts={note.flows.rows.filter((r) => r.version === key || r.version === `${key}_note`)}
            rowLabels={note.flows.labels} rowHeading="Paywall flow" allUsersOnly showAppuComparison showInstallPaid showRefundRate
            onRowClick={openPreview} />
        </section>)}
      </details>
      <p className="mt-3 text-xs text-muted-foreground">Includes people who leave before the paywall. Flow labels reflect enrollment; US override entrants start in HP. Base offer assignments, including historical users, remain in the separate table below.</p>
    </DashboardCard> : null}
    <DashboardCard title="Paywall flows" contentClassName="pt-0"
    titleAccessory={report && report.status !== "unavailable" ? <AppuReadinessIndicator cohorts={report.rows} /> : null}
    action={<span className="text-xs text-muted-foreground">{experimentCohortLabel("poky") ?? windowLabel}</span>}>
    {!report || report.status === "unavailable"
      ? <p role="status" className="py-2 text-sm text-muted-foreground">Paywall flow reporting is unavailable. Refresh to retry.</p>
      : <>
        <p className="pb-2 text-xs text-muted-foreground">New assignments: HP 50% · Trials 50% · Trial users split equally between 3-day, 7-day current and 7-day mascot (⅓ each){report.status === "empty" ? " · Waiting for new assignments" : ""}</p>
        {report.warnings.map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
        <JourneyVersionComparison cohorts={report.rows} rowLabels={report.labels} rowHeading="Paywall flow"
          allUsersOnly showAppuComparison showArpuGraph showInstallPaid showRefundRate
          onRowClick={openPreview} />
      </>}
    </DashboardCard>
    <DialogContent className={`max-h-[90vh] overflow-y-auto rounded-2xl ${selectedFlow !== "current" ? "sm:max-w-[min(96vw,1000px)]" : "sm:max-w-md"}`}
      onCloseAutoFocus={(event) => { event.preventDefault(); previewTrigger.current?.focus(); }}>
      <DialogHeader>
        <DialogTitle>{preview?.title}</DialogTitle>
        <DialogDescription>{preview?.description}</DialogDescription>
      </DialogHeader>
      {preview && selectedFlow ? <ol className="flex min-w-0 gap-4 overflow-x-auto pb-1 scrollbar-none sm:gap-6" aria-label={`${preview.title} screens`}>
        {preview.screens.map((screen, index) => <li key={screen.src} className="w-[min(68vw,260px)] shrink-0 sm:w-0 sm:flex-1">
          {preview.screens.length > 1 ? <p className="mb-3 text-xs font-medium text-muted-foreground">{index + 1}. {screen.label}</p> : null}
          <Image src={screen.src}
            alt={`Poky ${preview.title}, step ${index + 1}: ${screen.label}`} width={368} height={800} sizes="320px"
            className="mx-auto h-[min(65vh,640px)] max-h-[calc(90vh-10rem)] w-auto max-w-full rounded-2xl object-contain" />
        </li>)}
      </ol> : null}
    </DialogContent>
  </Dialog>;
}
