"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SortArrow } from "@/app/components/sort-arrow";
import {
  sortClientsByStatus,
  type ClientListRow,
  type ClientStatusSort,
} from "@/lib/client-list";
import { accountingMethodLabel } from "@/lib/company-settings";
import { BankButton } from "./bank-button";

export function ClientTable({ clients }: { clients: ClientListRow[] }) {
  const [statusSort, setStatusSort] = useState<ClientStatusSort>("asc");
  const rows = useMemo(
    () => sortClientsByStatus(clients, statusSort),
    [clients, statusSort]
  );
  const ascending = statusSort === "asc";

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-5 py-3.5 font-medium">Företag</th>
            <th className="px-5 py-3.5 font-medium">Org.nr</th>
            <th className="px-5 py-3.5 font-medium">Redovisningsmetod</th>
            <th className="px-5 py-3.5 font-medium">Senaste verifikation</th>
            <th className="w-px whitespace-nowrap px-5 py-3.5 text-center font-medium">
              <button
                type="button"
                id="status-sort"
                onClick={() =>
                  setStatusSort(ascending ? "desc" : "asc")
                }
                aria-label={
                  ascending
                    ? "Sortera status fallande"
                    : "Sortera status stigande"
                }
                className="inline-flex items-center gap-1 rounded-sm uppercase text-neutral-500 transition hover:text-neutral-800"
              >
                Status
                <SortArrow ascending={ascending} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((company) => (
            <tr
              key={company.id}
              className="group transition hover:bg-neutral-50"
            >
              <td className="p-0">
                <Link
                  href={`/foretag/${company.id}`}
                  className="block px-5 py-4 font-medium text-neutral-900"
                >
                  {company.name}
                </Link>
              </td>
              <td className="p-0">
                <Link
                  href={`/foretag/${company.id}`}
                  tabIndex={-1}
                  className="block px-5 py-4 tabular-nums text-neutral-500"
                >
                  {company.orgNumber}
                </Link>
              </td>
              <td className="p-0">
                <Link
                  href={`/foretag/${company.id}`}
                  tabIndex={-1}
                  className="block px-5 py-4 text-neutral-700"
                >
                  {accountingMethodLabel(company.accountingMethod)}
                </Link>
              </td>
              <td className="p-0">
                <Link
                  href={`/foretag/${company.id}`}
                  tabIndex={-1}
                  className="block px-5 py-4 tabular-nums text-neutral-900"
                >
                  {company.latestVoucherDate}
                </Link>
              </td>
              <td className="px-5 py-4 text-center">
                <BankButton companyId={company.id} linked={company.bankLinked} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
