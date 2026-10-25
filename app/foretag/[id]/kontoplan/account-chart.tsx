"use client";

import { useMemo, useState } from "react";
import { matchesAccountQuery } from "@/lib/db/bas-accounts";

type ChartAccount = {
  number: string;
  name: string;
  active: boolean;
};

export function AccountChart({ accounts }: { accounts: ChartAccount[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => accounts.filter((account) => matchesAccountQuery(account, query)),
    [accounts, query]
  );

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
        {accounts.length.toLocaleString("sv-SE")} konton
        {query.trim()
          ? ` · ${filtered.length.toLocaleString("sv-SE")} visade`
          : null}
      </p>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th className="w-28 px-6 py-3.5 font-medium">Nummer</th>
              <th className="px-6 py-3.5 font-medium">Namn</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((account) => (
              <tr key={account.number}>
                <td className="px-6 py-2.5 font-mono tabular-nums text-neutral-700">
                  {account.number}
                </td>
                <td className="px-6 py-2.5 text-neutral-900">
                  {account.name}
                  {!account.active ? (
                    <span className="ml-2 text-xs text-neutral-400">
                      Inaktiv
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
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
