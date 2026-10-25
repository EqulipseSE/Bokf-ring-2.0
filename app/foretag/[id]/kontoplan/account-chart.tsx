"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { matchesAccountQuery } from "@/lib/db/bas-accounts";
import { setAccountActive } from "./actions";

type ChartAccount = {
  id: string;
  number: string;
  name: string;
  active: boolean;
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

  function toggle(account: ChartAccount) {
    const next = !account.active;
    setError(null);
    startTransition(async () => {
      setOptimistic({ id: account.id, active: next });
      const result = await setAccountActive(companyId, account.id, next);
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
        Inaktiva konton syns här men inte när du bokför.
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
              <th className="w-28 px-6 py-3.5 font-medium">Nummer</th>
              <th className="px-6 py-3.5 font-medium">Namn</th>
              <th className="w-36 px-6 py-3.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((account) => (
              <tr
                key={account.id}
                className={account.active ? "" : "bg-neutral-50"}
              >
                <td
                  className={`px-6 py-2.5 font-mono tabular-nums ${
                    account.active ? "text-neutral-700" : "text-neutral-400"
                  }`}
                >
                  {account.number}
                </td>
                <td
                  className={`px-6 py-2.5 ${
                    account.active ? "text-neutral-900" : "text-neutral-400"
                  }`}
                >
                  {account.name}
                </td>
                <td className="px-6 py-2.5">
                  <div className="flex items-center gap-2">
                    {!account.active ? (
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600">
                        Inaktiv
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => toggle(account)}
                      className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
                    >
                      {account.active ? "Avaktivera" : "Aktivera"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-10 text-center text-neutral-500"
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
