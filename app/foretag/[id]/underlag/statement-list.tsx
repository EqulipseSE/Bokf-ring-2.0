"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatOre } from "@/lib/money";
import { matchesQuery } from "@/lib/search";
import type { BankStatementRow } from "@/lib/bank-statement";

export function StatementList({
  companyId,
  rows,
}: {
  companyId: string;
  rows: BankStatementRow[];
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(
    () =>
      rows.filter((row) =>
        matchesQuery(
          [row.date, row.description, row.reference, formatOre(row.outOre), formatOre(row.inOre)],
          query
        )
      ),
    [rows, query]
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
        <p className="font-medium text-neutral-900">Inget kontoutdrag ännu</p>
        <p className="mt-1 text-sm text-neutral-500">
          Hämta kontoutdraget från klientlistan.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-4 py-3">
        <label className="sr-only" htmlFor="statement-search">
          Sök transaktioner
        </label>
        <input
          id="statement-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Sök datum, text, OCR eller belopp"
          autoComplete="off"
          className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:ring-1 focus:ring-neutral-400"
        />
      </div>
      {visible.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-neutral-500">
          Inga transaktioner matchar sökningen.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3.5 font-medium">Datum</th>
              <th className="px-4 py-3.5 font-medium">Text</th>
              <th className="px-4 py-3.5 font-medium">OCR</th>
              <th className="px-4 py-3.5 text-right font-medium">In</th>
              <th className="px-4 py-3.5 text-right font-medium">Ut</th>
              <th className="px-4 py-3.5 text-right font-medium">Saldo</th>
              <th className="px-4 py-3.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {visible.map((row) => (
              <tr key={row.id} className="hover:bg-neutral-50">
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-neutral-500">
                  {row.date}
                </td>
                <td className="px-4 py-3 text-neutral-900">{row.description}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-neutral-900">
                  {row.reference}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-neutral-900">
                  {row.inOre ? formatOre(row.inOre) : ""}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-neutral-900">
                  {row.outOre ? formatOre(row.outOre) : ""}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-neutral-900">
                  {formatOre(row.balanceOre)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <span
                      aria-label={row.voucherId ? "Bokförd" : "Ej bokförd"}
                      className={`inline-block size-2.5 rounded-full ${
                        row.voucherId ? "bg-emerald-500" : "bg-neutral-300"
                      }`}
                    />
                    {row.voucherId ? (
                      <span className="group relative">
                        <Link
                          href={`/foretag/${companyId}/verifikationer/${row.voucherId}`}
                          aria-label="Visa verifikation"
                          className="flex size-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200 hover:text-neutral-950"
                        >
                          <ArrowRightIcon />
                        </Link>
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute top-full left-1/2 z-30 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                        >
                          Visa verifikation
                        </span>
                      </span>
                    ) : (
                      <span className="flex size-8 items-center justify-center text-neutral-300">
                        <ArrowRightIcon />
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
