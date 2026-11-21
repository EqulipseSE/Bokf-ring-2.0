"use client";

import { useRouter } from "next/navigation";
import { formatOre } from "@/lib/invoice-amounts";

export type CustomerInvoiceRow = {
  id: string;
  number: string;
  invoiceType: string;
  customerName: string;
  invoiceDate: string | null;
  dueDate: string | null;
  totalOre: number;
  currency: string;
  paymentDate: string | null;
  status: string;
};

export function CustomerInvoiceTable({
  companyId,
  rows,
}: {
  companyId: string;
  rows: CustomerInvoiceRow[];
}) {
  const router = useRouter();
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-neutral-200 bg-neutral-100 text-left text-xs font-medium text-neutral-600">
          {(
            [
              ["Fakturanummer", ""],
              ["Typ", ""],
              ["Namn", ""],
              ["Totalt", "text-right"],
              ["Fakturadatum", ""],
              ["Förfallodatum", ""],
              ["Status", ""],
              ["Betaldatum", ""],
            ] as const
          ).map(([label, align]) => (
            <th key={label} className={`whitespace-nowrap px-2 py-1.5 font-medium ${align}`}>
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={8} className="px-2 py-4 text-sm text-neutral-500">
              Inga kundfakturor ännu.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-b border-neutral-100 hover:bg-neutral-100"
              onClick={() => router.push(`/foretag/${companyId}/kundfakturor/kort/${row.id}`)}
            >
              <td className="whitespace-nowrap px-2 py-1 tabular-nums">{String(row.number).padStart(5, "0")}</td>
              <td className="whitespace-nowrap px-2 py-1">{row.invoiceType}</td>
              <td className="whitespace-nowrap px-2 py-1">{row.customerName}</td>
              <td className="whitespace-nowrap px-2 py-1 text-right tabular-nums">
                {formatOre(row.totalOre)} {row.currency}
              </td>
              <td className="whitespace-nowrap px-2 py-1 tabular-nums">{row.invoiceDate ?? ""}</td>
              <td className="whitespace-nowrap px-2 py-1 tabular-nums">{row.dueDate ?? ""}</td>
              <td className="whitespace-nowrap px-2 py-1">{row.status}</td>
              <td className="whitespace-nowrap px-2 py-1 tabular-nums">{row.paymentDate ?? ""}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
