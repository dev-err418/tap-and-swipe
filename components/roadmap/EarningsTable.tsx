"use client";

import { useState } from "react";

const COMMISSION_RATE = 0.3;
const REFERRAL_TIERS = [1, 2, 5, 10, 20];
const PRICES = [99, 149] as const;

const eur = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default function EarningsTable() {
  const [price, setPrice] = useState<(typeof PRICES)[number]>(99);

  return (
    <div>
      <p className="mt-2 text-sm text-black/60">
        Based on the {eur.format(price)}/month plan at{" "}
        {Math.round(COMMISSION_RATE * 100)}% recurring commission.
      </p>

      <div className="mx-auto mt-4 inline-flex rounded-full border border-black/10 bg-white p-1 sm:flex sm:w-fit">
        {PRICES.map((p) => {
          const active = p === price;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPrice(p)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-black text-white"
                  : "text-black/55 hover:text-black"
              }`}
            >
              {eur.format(p)}/mo
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-4 max-w-xl overflow-hidden rounded-2xl border border-black/10 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-black/[0.02] text-left text-xs uppercase tracking-wide text-black/50">
              <th className="px-5 py-3 font-medium">Active referrals</th>
              <th className="px-5 py-3 font-medium">Monthly</th>
              <th className="px-5 py-3 font-medium">Yearly</th>
            </tr>
          </thead>
          <tbody>
            {REFERRAL_TIERS.map((n) => {
              const monthly = price * COMMISSION_RATE * n;
              const yearly = monthly * 12;
              return (
                <tr
                  key={n}
                  className="border-b border-black/5 last:border-b-0"
                >
                  <td className="px-5 py-3 font-medium text-black">
                    {n} {n === 1 ? "referral" : "referrals"}
                  </td>
                  <td className="px-5 py-3 text-black/70">
                    {eur.format(monthly)}/mo
                  </td>
                  <td className="px-5 py-3 text-black/70">
                    {eur.format(yearly)}/yr
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
