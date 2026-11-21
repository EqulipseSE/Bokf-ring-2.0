"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { formatOre } from "@/lib/money";
import { InvoiceStatusMarks } from "./status-marks";
import { setSupplierInvoiceSelection, useSupplierInvoiceSelection } from "./selection";

export type SupplierInvoiceRow = {
  id: string;
  documentId: string | null;
  invoiceNumber: string;
  levfakturaNumber: number;
  supplierName: string;
  totalOre: number;
  invoiceDate: string | null;
  dueDate: string | null;
  paymentDate: string | null;
  status: string;
  bookedInK: boolean;
  bookedInA: boolean;
};

const COLUMNS = [
  "Levfaktnr",
  "Fakturanummer",
  "Underlag",
  "Namn",
  "Totalt",
  "Fakturadatum",
  "Förfallodatum",
  "Status",
  "Betaldatum",
] as const;

export function SupplierInvoiceTable({
  companyId,
  rows,
}: {
  companyId: string;
  rows: SupplierInvoiceRow[];
}) {
  const router = useRouter();
  const selected = useSupplierInvoiceSelection();
  const selectedIds = selected.map((item) => item.id);
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  useEffect(() => () => setSupplierInvoiceSelection([]), []);

  function marked(row: SupplierInvoiceRow) {
    return { id: row.id, status: row.status, bookedInL: row.bookedInK };
  }

  function toggleAll() {
    setSupplierInvoiceSelection(allSelected ? [] : rows.map(marked));
  }

  function toggle(row: SupplierInvoiceRow) {
    setSupplierInvoiceSelection(
      selectedIds.includes(row.id)
        ? selected.filter((item) => item.id !== row.id)
        : [...selected, marked(row)]
    );
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-neutral-200 bg-neutral-100 text-left text-xs font-medium text-neutral-600">
          <th className="w-8 px-2 py-1.5">
            <input
              type="checkbox"
              aria-label="Markera alla"
              checked={allSelected}
              onChange={toggleAll}
            />
          </th>
          {COLUMNS.map((label) => (
            <th
              key={label}
              className={`whitespace-nowrap px-2 py-1.5 font-medium ${
                label === "Totalt" ? "text-right" : ""
              }`}
            >
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={COLUMNS.length + 1} className="px-2 py-4 text-sm text-neutral-500">
              Inga leverantörsfakturor ännu.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-100"
              onClick={() => router.push(`/foretag/${companyId}/leverantorsfakturor/kort/${row.id}`)}
            >
              <td className="px-2 py-1" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  aria-label={`Markera ${row.invoiceNumber}`}
                  checked={selectedIds.includes(row.id)}
                  onChange={() => toggle(row)}
                />
              </td>
              <td className="px-2 py-1">
                <span className="inline-flex items-center gap-1.5">
                  {row.status === "preliminar" && !row.bookedInK && !row.bookedInA ? (
                    <InvoiceStatusMarks preliminary approved={false} bookedInK={false} bookedInA={false} />
                  ) : null}
                  <span className="tabular-nums">{String(row.levfakturaNumber).padStart(5, "0")}</span>
                </span>
              </td>
              <td className="whitespace-nowrap px-2 py-1">{row.invoiceNumber}</td>
              <td className="px-2 py-1" onClick={(event) => event.stopPropagation()}>
                {row.documentId ? (
                  <span className="group relative inline-flex">
                    <Link
                      href={`/foretag/${companyId}/underlag/fil/${row.documentId}`}
                      target="_blank"
                      aria-label="Visa underlag"
                      className="inline-flex h-7 w-7 items-center justify-center rounded text-neutral-700 hover:bg-neutral-100"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4" aria-hidden>
                        <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M14 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                    <span className="pointer-events-none absolute top-full left-1/2 z-20 mt-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-neutral-900 px-2 py-1 text-xs text-white group-hover:block">
                      Visa underlag
                    </span>
                  </span>
                ) : null}
              </td>
              <td className="px-2 py-1">{row.supplierName}</td>
              <td className="px-2 py-1 text-right tabular-nums">{formatOre(row.totalOre)}</td>
              <td className="px-2 py-1">{row.invoiceDate}</td>
              <td className="px-2 py-1">{row.dueDate}</td>
              <td className="px-2 py-1">
                <InvoiceStatusMarks
                  preliminary={row.status === "preliminar"}
                  approved={row.status === "godkand"}
                  bookedInK={row.bookedInK}
                  bookedInA={row.bookedInA}
                />
              </td>
              <td className="whitespace-nowrap px-2 py-1 tabular-nums">{row.paymentDate}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
