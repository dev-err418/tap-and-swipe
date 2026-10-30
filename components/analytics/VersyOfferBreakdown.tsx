"use client";

import { createContext, Fragment, useContext, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { versyOfferRows, type OfferBreakdown } from "@/lib/versy-offer-breakdown";

const VersyOffersContext = createContext(false);
export function VersyOffersScope({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <VersyOffersContext.Provider value={enabled}>{children}</VersyOffersContext.Provider>;
}
type Props = { breakdown?: OfferBreakdown; users: number; proceeds: number; available?: boolean; enabled?: boolean; inline?: boolean };
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = (value: number) => value.toLocaleString("en-US");
const colors = ["#2563eb", "#f59e0b", "#8b5cf6", "#a1a1aa"];

/** Same denominator as the adjacent APPU. Static mode also fits chart tooltips. */
export default function VersyOfferBreakdown({ breakdown, users, proceeds, available = true, enabled, inline = false }: Props) {
  const inVersy = useContext(VersyOffersContext);
  if (!(enabled ?? inVersy)) return null;
  const rows = versyOfferRows(breakdown);
  const complete = available && Number.isFinite(proceeds) && rows.every((row) => !row.missingMoney)
    && Math.abs(rows.reduce((sum, row) => sum + row.proceeds, 0) - proceeds) < 0.02;
  if (!complete) return <span className="mt-1 block text-[10px] font-normal text-muted-foreground">Offer mix unavailable</span>;
  if (inline) return <OfferMixTable rows={rows} users={users} proceeds={proceeds} compact />;
  return <Dialog>
    <DialogTrigger asChild>
    <button type="button" aria-haspopup="dialog"
      aria-label="View offer counts and APPU contribution"
      className="mt-1 block w-full cursor-pointer rounded-sm text-right text-[10px] font-normal leading-4 text-muted-foreground underline decoration-black/20 underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      Main {count(rows[0].subscriptions)} · Weekly {count(rows[1].subscriptions)} · Recovery {count(rows[2].subscriptions)}
      {rows[3] ? ` · Other ${count(rows[3].subscriptions)}` : ""}
    </button></DialogTrigger>
    <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Where APPU comes from</DialogTitle>
        <DialogDescription>{count(users)} users · {money(proceeds)} net proceeds · {users > 0 ? money(proceeds / users) : "—"} total APPU</DialogDescription>
      </DialogHeader>
      <OfferMixTable rows={rows} users={users} proceeds={proceeds} />
      <p className="text-xs leading-relaxed text-muted-foreground">Counts are paid subscriptions per product. Renewals add proceeds without adding subscriptions; free trials are excluded. APPU contribution divides each offer’s net proceeds by all {count(users)} users, including non-payers. Contributions add up to total APPU before rounding. Refunds reduce proceeds.</p>
      <p className="text-xs leading-relaxed text-muted-foreground">Prices are US reference prices. Recovery / daily gift uses the $16.99 discounted yearly product. Retired products, including the older $17.99 yearly plan, stay in Other / historical. This is a purchased-product breakdown; promotions on the same product remain with that product.</p>
    </DialogContent>
  </Dialog>;
}

function OfferMixTable({ rows, users, proceeds, compact = false }: {
  rows: ReturnType<typeof versyOfferRows>; users: number; proceeds: number; compact?: boolean;
}) {
  const positiveMix = proceeds > 0 && rows.every((row) => row.proceeds >= 0);
  return <div className="min-w-0 space-y-3 text-left font-normal">
    {positiveMix ? <div className="flex h-2 overflow-hidden rounded-full" aria-label="Share of net proceeds by offer">
      {rows.map((row, index) => <span key={row.key} style={{ width: `${row.proceeds / proceeds * 100}%`, backgroundColor: colors[index] }}
        title={`${row.label}: ${(row.proceeds / proceeds * 100).toFixed(1)}%`} />)}
    </div> : null}
    <div className="overflow-x-auto">
      <table className={`w-full text-xs tabular-nums ${compact ? "min-w-72" : "min-w-[460px]"}`}>
        <thead><tr className="border-b text-muted-foreground">
          <th className="py-2 pr-3 font-medium">Offer</th><th className="px-2 text-right font-medium">Paid subs</th>
          {!compact && <th className="px-2 text-right font-medium">Net proceeds</th>}
          <th className="px-2 text-right font-medium">APPU contribution</th><th className="pl-2 text-right font-medium">Share</th>
        </tr></thead>
        <tbody>{rows.map((row, index) => <Fragment key={row.key}>
          <tr className="border-b border-black/5">
            <th className="py-2 pr-3 font-medium"><span aria-hidden className="mr-1.5 inline-block size-2 rounded-sm" style={{ backgroundColor: colors[index] }} />{row.label}<span className="block text-[10px] font-normal text-muted-foreground">{row.detail}</span></th>
            <td className="px-2 text-right">{count(row.subscriptions)}</td>
            {!compact && <td className="px-2 text-right">{money(row.proceeds)}</td>}
            <td className="px-2 text-right font-medium">{users > 0 ? money(row.proceeds / users) : "—"}</td>
            <td className="pl-2 text-right">{proceeds > 0 ? `${(row.proceeds / proceeds * 100).toFixed(1)}%` : "—"}</td>
          </tr>
          {row.children.map((child) => <tr key={child.label} className="text-muted-foreground">
            <th className="py-1 pl-4 pr-3 font-normal">{child.label}</th><td className="px-2 text-right">{count(child.subscriptions)}</td>
            {!compact && <td className="px-2 text-right">{money(child.proceeds)}</td>}
            <td className="px-2 text-right">{users > 0 ? money(child.proceeds / users) : "—"}</td>
            <td className="pl-2 text-right">{proceeds > 0 ? `${(child.proceeds / proceeds * 100).toFixed(1)}%` : "—"}</td>
          </tr>)}
        </Fragment>)}</tbody>
      </table>
    </div>
  </div>;
}
