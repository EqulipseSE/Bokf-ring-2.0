"use client";

import { useEffect, useState } from "react";
import { setCustomerHidden } from "./customer-actions";

export type CustomerRow = {
  id: string;
  number: string;
  name: string;
  customerType: string;
  phone: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  hidden: boolean;
};

const COLUMNS = [
  { label: "Markering", tight: true },
  { label: "Dölj", tight: true },
  { label: "Kundnummer", tight: false },
  { label: "Namn", tight: false },
  { label: "Typ", tight: false },
  { label: "Telefon", tight: false },
  { label: "Adress", tight: false },
  { label: "Postnummer/Ort", tight: false },
  { label: "Fordran", tight: false },
] as const;

const TYPE_LABEL = {
  foretag: "Företag",
  privatperson: "Privatperson",
} as const;

export function CustomerList({
  companyId,
  customers,
  showHidden,
}: {
  companyId: string;
  customers: CustomerRow[];
  showHidden: boolean;
}) {
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState(customers);
  useEffect(() => setRows(customers), [customers]);
  const visible = showHidden ? rows : rows.filter((customer) => !customer.hidden);

  async function hide(customerId: string, hidden: boolean) {
    setRows((current) =>
      current.map((customer) => (customer.id === customerId ? { ...customer, hidden } : customer))
    );
    await setCustomerHidden(companyId, customerId, hidden);
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-neutral-200 bg-neutral-100 text-left text-xs font-medium text-neutral-600">
          {COLUMNS.map((column) => (
            <th
              key={column.label}
              className={`whitespace-nowrap py-1.5 font-medium ${
                column.tight ? "w-0 px-1.5" : "px-3"
              }`}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visible.length === 0 ? (
          <tr>
            <td colSpan={COLUMNS.length} className="px-3 py-6 text-sm text-neutral-500">
              Inga kunder ännu.
            </td>
          </tr>
        ) : (
          visible.map((customer) => (
            <tr key={customer.id} className="border-b border-neutral-200">
              <td className="px-1.5 py-1.5 text-center">
                <input
                  type="checkbox"
                  aria-label={`Markera ${customer.name}`}
                  checked={marked.has(customer.id)}
                  onChange={(event) =>
                    setMarked((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(customer.id);
                      else next.delete(customer.id);
                      return next;
                    })
                  }
                />
              </td>
              <td className="px-1.5 py-1.5 text-center">
                <input
                  type="checkbox"
                  aria-label={`Dölj ${customer.name}`}
                  checked={customer.hidden}
                  onChange={(event) => hide(customer.id, event.target.checked)}
                />
              </td>
              <td className="whitespace-nowrap px-3 py-1.5">{customer.number}</td>
              <td className="px-3 py-1.5">{customer.name}</td>
              <td className="whitespace-nowrap px-3 py-1.5">
                {TYPE_LABEL[customer.customerType as keyof typeof TYPE_LABEL] ?? customer.customerType}
              </td>
              <td className="whitespace-nowrap px-3 py-1.5">{customer.phone ?? ""}</td>
              <td className="px-3 py-1.5">{customer.address ?? ""}</td>
              <td className="whitespace-nowrap px-3 py-1.5">
                {[customer.postalCode, customer.city].filter(Boolean).join(" ")}
              </td>
              <td className="px-3 py-1.5" />
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
