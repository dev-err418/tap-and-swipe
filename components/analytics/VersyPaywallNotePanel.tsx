"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";
import { VERSY_NOTE_FLOWS, type VersyNoteReport } from "@/lib/versy-paywall-note";

export default function VersyPaywallNotePanel({ report }: { report: VersyNoteReport }) {
  const [preview, setPreview] = useState<string | null>(null);
  const withNote = preview === "note" || !!preview?.endsWith("_note");
  return <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}>
    <DashboardCard title="Team note A/B test" contentClassName="pt-0">
      <p className="pb-2 text-xs text-muted-foreground">80% with note · 20% without · Reviews in both variants{report.overall.status === "empty" ? " · Waiting for the updated app" : ""}</p>
      {report.overall.warnings.map((warning) => <p key={warning} role="status" className="text-xs text-muted-foreground">{warning}</p>)}
      <JourneyVersionComparison cohorts={report.overall.rows} rowLabels={report.overall.labels} rowHeading="Note treatment"
        allUsersOnly showAppuComparison showArpuGraph showInstallPaid showRefundRate onRowClick={setPreview} />
      <p className="mt-2 text-xs text-muted-foreground">Note seen: {report.reached.note.note} · Continued: {report.reached.note.continued} · Reached paywall: {report.reached.note.paywall}</p>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm font-medium">Compare within each onboarding flow</summary>
        {VERSY_NOTE_FLOWS.map(({ key, label }) => <section key={key} className="mt-4">
          <h3 className="mb-2 text-sm font-medium">{label}</h3>
          <JourneyVersionComparison cohorts={report.flows.rows.filter((row) => row.version === key || row.version === `${key}_note`)}
            rowLabels={report.flows.labels} rowHeading="Onboarding flow" allUsersOnly showAppuComparison showInstallPaid showRefundRate onRowClick={setPreview} />
        </section>)}
      </details>
      <p className="mt-3 text-xs text-muted-foreground">Includes everyone enrolled at reviews, including non-payers and people who leave before the paywall. Independent of yearly price and Widget hard/soft access. Historical users without a saved note assignment are excluded.</p>
      <button type="button" className="mt-3 text-sm underline underline-offset-4" onClick={() => setPreview("note")}>Preview reviews and note</button>
    </DashboardCard>
    <DialogContent className="max-h-[95dvh] overflow-auto sm:max-w-3xl">
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
