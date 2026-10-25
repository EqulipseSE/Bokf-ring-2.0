"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { matchesAccountQuery } from "@/lib/db/bas-accounts";
import { formatOre } from "@/lib/money";
import { setAccountActive } from "./actions";

type ChartAccount = {
  id: string;
  number: string;
  name: string;
  active: boolean;
  openingOre: number;
  closingOre: number;
};

export function AccountChart({
  companyId,
  accounts,
}: {
  companyId: string;
  accounts: ChartAccount[];
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    accounts,
    (current, update: { id: string; active: boolean }) =>
      current.map((account) =>
        account.id === update.id
          ? { ...account, active: update.active }
          : account
      )
  );

  const filtered = useMemo(
    () => optimistic.filter((account) => matchesAccountQuery(account, query)),
    [optimistic, query]
  );
  const inactiveCount = optimistic.filter((account) => !account.active).length;

  function toggle(account: ChartAccount, active: boolean) {
    if (active === account.active) return;
    setError(null);
    startTransition(async () => {
      setOptimistic({ id: account.id, active });
      const result = await setAccountActive(companyId, account.id, active);
      if (!result.ok) {
        setOptimistic({ id: account.id, active: account.active });
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="max-w-sm text-xs text-neutral-500">
        Sök konto
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nummer eller namn"
          className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
        />
      </label>

      <p className="text-sm text-neutral-500">
        {optimistic.length.toLocaleString("sv-SE")} konton
        {inactiveCount > 0
          ? ` · ${inactiveCount.toLocaleString("sv-SE")} inaktiva`
          : null}
        {query.trim()
          ? ` · ${filtered.length.toLocaleString("sv-SE")} visade`
          : null}
      </p>
      <p className="text-xs text-neutral-400">
        Ikryssad = aktiv vid bokföring. Inaktiva syns här men inte i
        kontosöket.
      </p>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th className="w-10 px-4 py-3.5 font-medium">
                <span className="sr-only">Aktiv</span>
              </th>
              <th className="w-24 py-3.5 pr-4 font-medium">Nummer</th>
              <th className="px-4 py-3.5 font-medium">Namn</th>
              <th className="w-36 px-4 py-3.5 text-right font-medium">
                Ingående saldo
              </th>
              <th className="w-36 px-4 py-3.5 text-right font-medium">
                Utgående saldo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((account) => (
              <tr
                key={account.id}
                className={account.active ? "" : "bg-neutral-50"}
              >
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={account.active}
                    onChange={(event) => toggle(account, event.target.checked)}
                    aria-label={`Aktivt konto ${account.number} ${account.name}`}
                    className="h-4 w-4 accent-neutral-900"
                  />
                </td>
                <td
                  className={`py-2.5 pr-4 font-mono tabular-nums ${
                    account.active ? "text-neutral-700" : "text-neutral-400"
                  }`}
                >
                  {account.number}
                </td>
                <td
                  className={`px-4 py-2.5 ${
                    account.active ? "text-neutral-900" : "text-neutral-400"
                  }`}
                >
                  {account.name}
                </td>
                <td
                  className={`px-4 py-2.5 text-right tabular-nums ${
                    account.active ? "text-neutral-700" : "text-neutral-400"
                  }`}
                >
                  {formatOre(account.openingOre)}
                </td>
                <td
                  className={`px-4 py-2.5 text-right tabular-nums ${
                    account.active ? "text-neutral-700" : "text-neutral-400"
                  }`}
                >
                  {formatOre(account.closingOre)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-neutral-500"
                >
                  Inga konton matchar sökningen.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
