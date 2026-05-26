"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, CreditCard, ExternalLink, KeyRound, Loader2 } from "lucide-react";

const WHOP_MEMBERSHIPS_URL = "https://whop.com/@me/settings/memberships/";

export default function AsoManagePage() {
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/aso/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey }),
      });
      const data = await response.json();

      if (!response.ok || !data.url) {
        setError(data.error || "Could not open subscription management.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Could not open subscription management.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#2a2725] px-6 py-10 text-[#f1ebe2] selection:bg-[#f4cf8f]/30">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-10">
        <a
          href="/aso"
          className="inline-flex w-fit items-center gap-2 text-sm text-[#c9c4bc] transition hover:text-[#f1ebe2]"
        >
          <ArrowLeft className="h-4 w-4" />
          AppSprint ASO
        </a>

        <section className="space-y-8">
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f4cf8f]/15 text-[#f4cf8f]">
              <CreditCard className="h-5 w-5" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              Manage your ASO subscription
            </h1>
            <p className="text-base leading-7 text-[#c9c4bc]">
              Enter the license key from your purchase email to open the billing portal and cancel your trial or subscription.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[#f1ebe2]">License key</span>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 focus-within:border-[#f4cf8f]/70">
                <KeyRound className="h-4 w-4 shrink-0 text-[#c9c4bc]" />
                <input
                  value={licenseKey}
                  onChange={(event) => setLicenseKey(event.target.value)}
                  placeholder="ASO-XXXX-XXXX-XXXX-XXXX"
                  className="h-12 min-w-0 flex-1 bg-transparent font-mono text-sm tracking-wide text-[#f1ebe2] outline-none placeholder:text-[#8f8981]"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </label>

            {error && (
              <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || licenseKey.trim().length === 0}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f4cf8f] px-5 text-sm font-bold text-[#2a2725] transition hover:bg-[#f4cf8f]/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Open billing portal
                </>
              )}
            </button>
          </form>

          <p className="text-sm leading-6 text-[#c9c4bc]">
            Bought through Whop? You can also open your Whop memberships directly.
            {" "}
            <a
              href={WHOP_MEMBERSHIPS_URL}
              className="font-semibold text-[#f4cf8f] underline-offset-4 transition hover:text-[#ffe1a8] hover:underline"
            >
              Manage on Whop
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
