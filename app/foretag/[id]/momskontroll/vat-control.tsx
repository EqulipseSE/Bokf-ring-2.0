"use client";

import { useState } from "react";
import Link from "next/link";
import { DateTextInput } from "@/app/components/date-text-input";
import { formatOre } from "@/lib/money";
import { parseVoucherDate, todayIsoDate } from "@/lib/voucher-date";
import { loadVatControl, type VatControlResult } from "./actions";

const fieldClass =
  "h-10 w-40 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm tabular-nums text-neutral-900 outline-none focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-200";

export function VatControl({
  companyId,
  suggestedFrom,
  suggestedTo,
}: {
  companyId: string;
  suggestedFrom: string;
  suggestedTo: string;
}) {
  const today = todayIsoDate();
  const [from, setFrom] = useState(suggestedFrom);
  const [to, setTo] = useState(suggestedTo);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<VatControlResult | null>(null);

  async function show() {
    const parsedFrom = parseVoucherDate(from, today);
    const parsedTo = parseVoucherDate(to, parsedFrom.ok ? parsedFrom.iso : today);
    if (!parsedFrom.ok) {
      setError(parsedFrom.error);
      return;
    }
    if (!parsedTo.ok) {
      setError(parsedTo.error);
      return;
    }
    setFrom(parsedFrom.iso);
    setTo(parsedTo.iso);
    setPending(true);
    setError(null);
    const loaded = await loadVatControl(companyId, parsedFrom.iso, parsedTo.iso);
    setPending(false);
    if (!loaded.ok) {
      setError(loaded.error);
      return;
    }
    setResult(loaded.result);
  }

  if (result) {
    return (
      <div className="w-full max-w-3xl">
        <p className="text-sm tabular-nums text-neutral-500">
          {result.from} – {result.to}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Omsättning</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-neutral-900">{formatOre(result.turnoverOre)}</dd>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Förväntad utgående moms</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-neutral-900">{formatOre(result.expectedOre)}</dd>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Redovisad moms</dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-neutral-900">{formatOre(result.reportedOre)}</dd>
          </div>
        </dl>
        <section className="mt-8">
          <h2 className="text-sm font-medium text-neutral-800">Avvikelser</h2>
          {result.mismatches.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-sm text-neutral-500 shadow-sm">
              Inga verifikationer där utgående moms skiljer sig från intäktskontot.
            </p>
          ) : (
            <ul className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm divide-y divide-neutral-100">
              {result.mismatches.map((voucher) => (
                <li key={voucher.id}>
                  <Link
                    href={`/foretag/${companyId}/verifikationer/${voucher.id}`}
                    className="grid grid-cols-[6rem_7rem_1fr_auto] gap-3 px-3 py-2 text-sm hover:bg-neutral-100"
                  >
                    <span className="tabular-nums text-neutral-900">{voucher.label}</span>
                    <span className="tabular-nums text-neutral-600">{voucher.date}</span>
                    <span className="truncate text-neutral-800">{voucher.text}</span>
                    <span className="text-right tabular-nums text-neutral-700">
                      {formatOre(voucher.reportedOre)} / {formatOre(voucher.expectedOre)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  return (
    <form
      className="w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void show();
      }}
    >
      <p className="text-sm text-neutral-500">Välj perioden som ska kontrolleras.</p>
      <div className="mt-5 flex flex-wrap items-end gap-4">
        <label className="grid gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Från
          <DateTextInput aria-label="Från" value={from} onChange={(event) => setFrom(event.target.value)} className={fieldClass} />
        </label>
        <label className="grid gap-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Till
          <DateTextInput aria-label="Till" value={to} onChange={(event) => setTo(event.target.value)} className={fieldClass} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-neutral-900 px-5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {pending ? "Hämtar…" : "Visa"}
        </button>
      </div>
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
