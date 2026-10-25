"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { formatOre } from "@/lib/money";
import type { VoucherListItem } from "@/lib/vouchers";

export function VoucherList({
  companyId,
  items,
}: {
  companyId: string;
  items: VoucherListItem[];
}) {
  const router = useRouter();
  const newHref = `/foretag/${companyId}/verifikationer/ny`;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        router.push(newHref);
        return;
      }
      if (!typing && event.key.toLowerCase() === "n" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        router.push(newHref);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newHref, router]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
        <p className="font-medium text-neutral-900">Inga verifikationer ännu</p>
        <p className="mt-1 text-sm text-neutral-500">
          Registrera den första verifikationen för det här företaget.
        </p>
        <Link
          href={newHref}
          className="mt-6 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Ny verifikation
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-6 py-3.5 font-medium">Ver.nr</th>
            <th className="px-6 py-3.5 font-medium">Datum</th>
            <th className="px-6 py-3.5 font-medium">Text</th>
            <th className="px-6 py-3.5 text-right font-medium">Belopp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {items.map((item) => {
            const href = `/foretag/${companyId}/verifikationer/${item.id}`;
            return (
              <tr key={item.id} className="group transition hover:bg-neutral-50">
                <td className="p-0">
                  <Link
                    href={href}
                    className="block px-6 py-4 font-medium tabular-nums text-neutral-900"
                  >
                    {item.numberLabel}
                  </Link>
                </td>
                <td className="p-0">
                  <Link
                    href={href}
                    tabIndex={-1}
                    className="block px-6 py-4 tabular-nums text-neutral-500"
                  >
                    {item.date}
                  </Link>
                </td>
                <td className="p-0">
                  <Link
                    href={href}
                    tabIndex={-1}
                    className="block px-6 py-4 text-neutral-900"
                  >
                    {item.text}
                  </Link>
                </td>
                <td className="p-0">
                  <Link
                    href={href}
                    tabIndex={-1}
                    className="block px-6 py-4 text-right tabular-nums text-neutral-900"
                  >
                    {formatOre(item.amountOre)}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
