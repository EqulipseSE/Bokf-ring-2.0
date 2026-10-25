"use client";

import { useMemo, useState } from "react";
import {
  ACCOUNT_NUMBER_PATTERN,
  BAS_ACCOUNTS,
  BAS_YEAR,
  matchesAccountQuery,
  type AccountDraft,
} from "@/lib/db/bas-accounts";

type DraftRow = AccountDraft & { id: string };

function toRows(accounts: readonly AccountDraft[]): DraftRow[] {
  return accounts.map((account) => ({
    id: account.number,
    number: account.number,
    name: account.name,
  }));
}

export function AccountPlanEditor() {
  const [rows, setRows] = useState<DraftRow[]>(() => toRows(BAS_ACCOUNTS));
  const [query, setQuery] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const filtered = useMemo(
    () => rows.filter((row) => matchesAccountQuery(row, query)),
    [rows, query]
  );

  function startEdit(row: DraftRow) {
    setEditingId(row.id);
    setDraftName(row.name);
  }

  function commitEdit() {
    if (!editingId) return;
    const name = draftName.trim();
    if (!name) {
      setLocalError("Kontonamnet får inte vara tomt.");
      return;
    }
    setRows((current) =>
      current.map((row) => (row.id === editingId ? { ...row, name } : row))
    );
    setEditingId(null);
    setLocalError(null);
  }

  function addAccount() {
    const number = newNumber.trim();
    const name = newName.trim();
    if (!ACCOUNT_NUMBER_PATTERN.test(number)) {
      setLocalError("Kontonumret måste vara fyra siffror.");
      return;
    }
    if (!name) {
      setLocalError("Fyll i kontonamn.");
      return;
    }
    if (rows.some((row) => row.number === number)) {
      setLocalError(`Kontot ${number} finns redan.`);
      return;
    }
    setRows((current) =>
      [...current, { id: number, number, name }].sort((a, b) =>
        a.number.localeCompare(b.number, "sv")
      )
    );
    setNewNumber("");
    setNewName("");
    setQuery(number);
    setLocalError(null);
  }

  function removeAccount(id: string) {
    if (rows.length <= 1) {
      setLocalError("Kontoplanen måste innehålla minst ett konto.");
      return;
    }
    setRows((current) => current.filter((row) => row.id !== id));
    if (editingId === id) setEditingId(null);
    setLocalError(null);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-neutral-700">
        Kontoplan
      </legend>
      <p className="text-xs text-neutral-500">
        Standard är hela BAS {BAS_YEAR} ({BAS_ACCOUNTS.length.toLocaleString("sv-SE")}{" "}
        konton). Lägg till, ta bort eller byt namn innan du sparar företaget.
      </p>

      <input
        type="hidden"
        name="accounts"
        value={JSON.stringify(rows.map(({ number, name }) => ({ number, name })))}
      />

      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1 text-xs text-neutral-500">
          Sök konto
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nummer eller namn"
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setRows(toRows(BAS_ACCOUNTS));
            setQuery("");
            setEditingId(null);
            setLocalError(null);
          }}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
        >
          Återställ till BAS {BAS_YEAR}
        </button>
      </div>

      <p className="text-xs text-neutral-500">
        {rows.length.toLocaleString("sv-SE")} konton
        {query.trim()
          ? ` · ${filtered.length.toLocaleString("sv-SE")} visade`
          : null}
      </p>

      <div className="max-h-80 overflow-auto rounded-lg border border-neutral-200">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="w-24 px-3 py-2 font-medium">Nummer</th>
              <th className="px-3 py-2 font-medium">Namn</th>
              <th className="w-16 px-3 py-2 font-medium">
                <span className="sr-only">Ta bort</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((row) => (
              <tr key={row.id} className="bg-white">
                <td className="px-3 py-1.5 font-mono tabular-nums text-neutral-700">
                  {row.number}
                </td>
                <td className="px-3 py-1.5">
                  {editingId === row.id ? (
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitEdit();
                        }
                        if (event.key === "Escape") {
                          setEditingId(null);
                          setLocalError(null);
                        }
                      }}
                      className="w-full rounded border border-neutral-300 px-2 py-1 text-neutral-900 outline-none focus:border-neutral-500"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="w-full rounded px-1 py-0.5 text-left text-neutral-900 hover:bg-neutral-50"
                    >
                      {row.name}
                    </button>
                  )}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => removeAccount(row.id)}
                    className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-red-50 hover:text-red-700"
                    aria-label={`Ta bort ${row.number} ${row.name}`}
                  >
                    Ta bort
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-3 py-6 text-center text-sm text-neutral-500"
                >
                  Inga konton matchar sökningen.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="w-24 text-xs text-neutral-500">
          Nummer
          <input
            type="text"
            inputMode="numeric"
            value={newNumber}
            onChange={(event) => setNewNumber(event.target.value)}
            placeholder="3011"
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
          />
        </label>
        <label className="min-w-48 flex-1 text-xs text-neutral-500">
          Namn
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Eget konto"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addAccount();
              }
            }}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
          />
        </label>
        <button
          type="button"
          onClick={addAccount}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
        >
          Lägg till konto
        </button>
      </div>

      {localError ? (
        <p role="alert" className="text-sm text-red-700">
          {localError}
        </p>
      ) : null}
    </fieldset>
  );
}
