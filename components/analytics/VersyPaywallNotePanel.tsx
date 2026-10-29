"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";
import type { VersyNoteReport } from "@/lib/versy-paywall-note";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";

export default function VersyPaywallNotePanel({ report }: { report: VersyNoteReport }) {
  const [preview, setPreview] = useState<string | null>(null);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const openPreview = (key: string, trigger: HTMLButtonElement) => {
    previewTrigger.current = trigger;
    setPreview(key);
  };
  const withNote = preview === "note" || !!preview?.endsWith("_note");
  return <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}>
    <DashboardCard title="Paywall flows · note variants" contentClassName="pt-0"
      action={<span className="text-xs text-muted-foreground">{experimentCohortLabel("versy")}</span>}>
      <p className="pb-2 text-xs text-muted-foreground">Without-note rows combine previous users and current controls. Includes all countries and trial lengths. These are historical and current performance totals.</p>
      {report.flows.warnings.map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
      <JourneyVersionComparison cohorts={report.flows.rows} rowLabels={report.flows.labels} rowHeading="Flow"
        allUsersOnly showInstallPaid showRefundRate onRowClick={openPreview} />
    </DashboardCard>
    <DashboardCard title="Team note A/B test" contentClassName="pt-0">
      <p className="pb-2 text-xs text-muted-foreground">80% with note · 20% without · Reviews in both variants{report.overall.status === "empty" ? " · Waiting for the updated app" : ""}</p>
      {report.overall.warnings.map((warning) => <p key={warning} role="status" className="text-xs text-muted-foreground">{warning}</p>)}
      <JourneyVersionComparison cohorts={report.overall.rows} rowLabels={report.overall.labels} rowHeading="Note treatment"
        allUsersOnly showAppuComparison showArpuGraph showInstallPaid showRefundRate onRowClick={openPreview} />
      <p className="mt-2 text-xs text-muted-foreground">Note seen: {report.reached.note.note} · Continued: {report.reached.note.continued} · Reached paywall: {report.reached.note.paywall}</p>
      <p className="mt-3 text-xs text-muted-foreground">Includes everyone enrolled at reviews, including non-payers and people who leave before the paywall. Independent of yearly price and Widget hard/soft access. Historical users without a saved note assignment are excluded.</p>
      <button type="button" className="mt-3 text-sm underline underline-offset-4" onClick={(event) => openPreview("note", event.currentTarget)}>Preview reviews and note</button>
    </DashboardCard>
    <DialogContent className="max-h-[95dvh] overflow-auto sm:max-w-3xl"
      onCloseAutoFocus={(event) => { event.preventDefault(); previewTrigger.current?.focus(); }}>
      <DialogHeader><DialogTitle>{withNote ? "Reviews → note → paywall" : "Reviews → paywall"}</DialogTitle>
        <DialogDescription>Both variants keep the existing reviews without an App Store rating prompt. {withNote ? "The team note follows for 80% of users." : "20% skip the team note."} Then the user continues through their assigned Widget or Bible Scroll paywall flow. Screens shown in English.</DialogDescription>
      </DialogHeader>
      <div className="flex gap-4 overflow-x-auto">
        {["reviews", ...(withNote ? ["team-note"] : [])].map((screen, index) => <figure key={screen} className="min-w-0 flex-1">
          <figcaption className="mb-2 text-xs text-muted-foreground">{index + 1}. {screen === "reviews" ? "Existing reviews" : "A note from the team"}</figcaption>
          <Image src={`/analytics/versy/paywall-note/${screen}.jpg`} alt={`Versy ${screen === "reviews" ? "existing reviews" : "team note"} screen`} width={368} height={800}
            className="mx-auto max-h-[65vh] w-auto rounded-2xl object-contain" />
        </figure>)}
      </div>
    </DialogContent>
  </Dialog>;
}
