"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { formatOre } from "@/lib/money";
import { matchesQuery } from "@/lib/search";
import type { VoucherListItem } from "@/lib/vouchers";

type ListSort = "number" | "newest";

const SORT_KEY = "omnio_voucher_list_sort";
const sortListeners = new Set<() => void>();

function readSort(): ListSort {
  try {
    return window.localStorage.getItem(SORT_KEY) === "newest"
      ? "newest"
      : "number";
  } catch {
    return "number";
  }
}

function subscribeSort(onStoreChange: () => void) {
  sortListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    sortListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function setListSort(next: ListSort) {
  window.localStorage.setItem(SORT_KEY, next);
  for (const listener of sortListeners) listener();
}

export function VoucherList({
  companyId,
  items,
}: {
  companyId: string;
  items: VoucherListItem[];
}) {
  const router = useRouter();
  const newHref = `/foretag/${companyId}/verifikationer/ny`;
  const [query, setQuery] = useState("");
  const sort = useSyncExternalStore(subscribeSort, readSort, (): ListSort => "number");
  const sorted = useMemo(() => {
    const filtered = items.filter((item) =>
      matchesQuery([item.numberLabel, item.number, item.text], query)
    );
    return sortItems(filtered, sort);
  }, [items, query, sort]);
  const ascending = sort === "number";

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
          Välj Ny verifikation i menyn för att registrera den första.
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
      <div className="border-b border-neutral-200 px-4 py-3">
        <label className="sr-only" htmlFor="voucher-list-search">
          Sök verifikationer
        </label>
        <input
          id="voucher-list-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Sök nummer eller text"
          autoComplete="off"
          className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:ring-1 focus:ring-neutral-400"
        />
      </div>
      {sorted.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-neutral-500">
          Inga verifikationer matchar sökningen.
        </p>
      ) : (
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-6 py-3.5 font-medium">
              <button
                type="button"
                onClick={() => setListSort(ascending ? "newest" : "number")}
                aria-label={
                  ascending
                    ? "Sortera fallande, högsta numret överst"
                    : "Sortera stigande, lägsta numret överst"
                }
                className="inline-flex items-center gap-1 rounded-sm text-neutral-500 transition hover:text-neutral-800"
              >
                Ver.nr
                <SortArrow ascending={ascending} />
              </button>
            </th>
            <th className="px-6 py-3.5 font-medium">Datum</th>
            <th className="px-6 py-3.5 font-medium">Text</th>
            <th className="px-6 py-3.5 text-right font-medium">Belopp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {sorted.map((item) => {
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
      )}
    </div>
  );
}

function SortArrow({ ascending }: { ascending: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ascending ? (
        <path d="M6 9.5V2.5M3.5 5 6 2.5 8.5 5" />
      ) : (
        <path d="M6 2.5v7M3.5 7 6 9.5 8.5 7" />
      )}
    </svg>
  );
}

function sortItems(items: VoucherListItem[], sort: ListSort): VoucherListItem[] {
  return [...items].sort((a, b) => {
    if (sort === "newest") {
      return b.number - a.number || b.letter.localeCompare(a.letter, "sv");
    }
    return a.letter.localeCompare(b.letter, "sv") || a.number - b.number;
  });
}
