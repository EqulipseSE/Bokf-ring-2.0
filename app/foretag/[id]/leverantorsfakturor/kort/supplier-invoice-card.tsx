"use client";

import { useState } from "react";
import { UnderlagPreview } from "@/app/foretag/[id]/verifikationer/underlag-preview";
import { formatOre } from "@/lib/money";

export type CardLine = {
  accountNumber: string;
  accountName: string;
  debitOre: number;
  creditOre: number;
};

export function SupplierInvoiceCard({
  levfakturaNumber,
  supplierNumber,
  supplierName,
  invoiceNumber,
  ocr,
  invoiceDate,
  dueDate,
  paymentDate,
  lines,
  document,
}: {
  levfakturaNumber: number;
  supplierNumber: string;
  supplierName: string;
  invoiceNumber: string;
  ocr: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  paymentDate: string | null;
  lines: CardLine[];
  document: { src: string; mimeType: string; fileName: string } | null;
}) {
  const [selected, setSelected] = useState(0);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="min-w-0 border-neutral-200 lg:border-r">
        <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2 px-4 py-4 text-sm">
          <dt className="text-neutral-500">Levfaktnr</dt>
          <dd className="tabular-nums">{String(levfakturaNumber).padStart(5, "0")}</dd>
          <dt className="text-neutral-500">Leverantör</dt>
          <dd>
            <span className="tabular-nums text-neutral-500">{supplierNumber}</span> {supplierName}
          </dd>
          <dt className="text-neutral-500">Fakturanummer</dt>
          <dd className="tabular-nums">{invoiceNumber}</dd>
          <dt className="text-neutral-500">OCR</dt>
          <dd className="tabular-nums">{ocr || invoiceNumber}</dd>
          <dt className="text-neutral-500">Fakturadatum</dt>
          <dd className="tabular-nums">{invoiceDate}</dd>
          <dt className="text-neutral-500">Förfallodatum</dt>
          <dd className="tabular-nums">{dueDate ?? ""}</dd>
          <dt className="text-neutral-500">Betaldatum</dt>
          <dd className="tabular-nums">{paymentDate ?? ""}</dd>
        </dl>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-neutral-200 bg-neutral-100 text-left text-xs font-medium text-neutral-600">
              <th className="w-24 px-2 py-1.5">Konto</th>
              <th className="px-2 py-1.5">Benämning</th>
              <th className="w-28 px-2 py-1.5 text-right">Debet</th>
              <th className="w-28 px-2 py-1.5 text-right">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr
                key={`${line.accountNumber}-${index}`}
                onClick={() => setSelected(index)}
                className={`cursor-pointer border-b border-neutral-200 ${
                  selected === index
                    ? "bg-neutral-100 shadow-[inset_3px_0_0_#171717]"
                    : "hover:bg-neutral-50"
                }`}
              >
                <td className="px-2 py-1.5 font-mono tabular-nums">{line.accountNumber}</td>
                <td className="px-2 py-1.5">{line.accountName}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {line.debitOre > 0 ? formatOre(line.debitOre) : ""}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {line.creditOre > 0 ? formatOre(line.creditOre) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="w-full max-w-[26rem] shrink-0 p-3">
        {document ? (
          <UnderlagPreview
            src={document.src}
            mimeType={document.mimeType}
            fileName={document.fileName}
            compact
          />
        ) : (
          <p className="px-4 py-8 text-sm text-neutral-500">Inget underlag är kopplat.</p>
        )}
      </div>
    </div>
  );
}
