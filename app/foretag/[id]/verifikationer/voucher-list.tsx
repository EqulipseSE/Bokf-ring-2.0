"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { formatOre } from "@/lib/money";
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
  const sort = useSyncExternalStore(subscribeSort, readSort, (): ListSort => "number");
  const sorted = sortItems(items, sort);

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
    <div>
      <div className="mb-3 flex justify-end">
        <div
          role="group"
          aria-label="Sortering"
          className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 text-xs"
        >
          <SortButton
            active={sort === "number"}
            onClick={() => setListSort("number")}
          >
            Nummerordning
          </SortButton>
          <SortButton
            active={sort === "newest"}
            onClick={() => setListSort("newest")}
          >
            Senast först
          </SortButton>
        </div>
      </div>
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
      </div>
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 font-medium transition ${
        active
          ? "bg-white text-neutral-900 shadow-sm"
          : "text-neutral-500 hover:text-neutral-800"
      }`}
    >
      {children}
    </button>
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
