"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { matchesAccountQuery } from "@/lib/db/bas-accounts";
import type { Account } from "@/lib/db/schema";
import { completeAmountDecimals, formatOre, formatOreInput, parseSignedAmountToOre } from "@/lib/money";
import type { BalanceKind } from "@/lib/balance-adjustment";
import { VatCodeSelect } from "@/app/components/vat-code-select";
import { AccountSearch } from "../verifikationer/account-search";
import { saveBalanceAdjustment, setAccountActive, setAccountVatCode } from "./actions";

type ChartAccount = {
  id: string;
  number: string;
  name: string;
  vatCode: string | null;
  active: boolean;
  openingOre: number;
  closingOre: number;
};

type EditState = {
  accountId: string;
  kind: BalanceKind;
  draft: string;
  contraId: string;
  contraQuery: string;
};

export function AccountChart({
  companyId,
  accounts,
  searchableAccounts,
}: {
  companyId: string;
  accounts: ChartAccount[];
  searchableAccounts: Account[];
}) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    accounts,
    (
      current,
      update:
        | { type: "active"; id: string; active: boolean }
        | { type: "vat"; id: string; vatCode: string | null }
        | { type: "balance"; id: string; openingOre: number; closingOre: number }
    ) =>
      current.map((account) => {
        if (account.id !== update.id) return account;
        if (update.type === "active") return { ...account, active: update.active };
        if (update.type === "vat") return { ...account, vatCode: update.vatCode };
        return {
          ...account,
          openingOre: update.openingOre,
          closingOre: update.closingOre,
        };
      })
  );

  const filtered = useMemo(
    () => optimistic.filter((account) => matchesAccountQuery(account, query)),
    [optimistic, query]
  );
  const inactiveCount = optimistic.filter((account) => !account.active).length;
  const editingAccount = edit
    ? (optimistic.find((account) => account.id === edit.accountId) ?? null)
    : null;
  const currentOre = editingAccount
    ? edit?.kind === "opening"
      ? editingAccount.openingOre
      : editingAccount.closingOre
    : 0;
  const nextOre = edit ? parseSignedAmountToOre(edit.draft) : null;
  const diffOre = nextOre == null ? null : nextOre - currentOre;
  const hasDiff = diffOre != null && diffOre !== 0;
  const remainingOre = !hasDiff ? 0 : edit?.contraId ? 0 : Math.abs(diffOre ?? 0);
  const canSave = Boolean(hasDiff && edit?.contraId && remainingOre === 0);

  function toggle(account: ChartAccount, active: boolean) {
    if (active === account.active) return;
    setError(null);
    startTransition(async () => {
      setOptimistic({ type: "active", id: account.id, active });
      const result = await setAccountActive(companyId, account.id, active);
      if (!result.ok) {
        setOptimistic({ type: "active", id: account.id, active: account.active });
        setError(result.error);
      }
    });
  }

  function setVat(account: ChartAccount, vatCode: string | null) {
    if (vatCode === (account.vatCode ?? null)) return;
    setError(null);
    startTransition(async () => {
      setOptimistic({ type: "vat", id: account.id, vatCode });
      const result = await setAccountVatCode(companyId, account.id, vatCode);
      if (!result.ok) {
        setOptimistic({
          type: "vat",
          id: account.id,
          vatCode: account.vatCode,
        });
        setError(result.error);
      }
    });
  }

  function startEdit(account: ChartAccount, kind: BalanceKind) {
    setError(null);
    setEdit({
      accountId: account.id,
      kind,
      draft: formatOreInput(
        kind === "opening" ? account.openingOre : account.closingOre
      ),
      contraId: "",
      contraQuery: "",
    });
  }

  function cancelEdit() {
    setEdit(null);
    setError(null);
  }

  function saveEdit() {
    if (!edit || !editingAccount || !canSave || nextOre == null) return;
    setError(null);
    const nextOpening =
      edit.kind === "opening" ? nextOre : editingAccount.openingOre;
    const nextClosing =
      edit.kind === "opening"
        ? editingAccount.closingOre + (nextOre - editingAccount.openingOre)
        : nextOre;
    startTransition(async () => {
      setOptimistic({
        type: "balance",
        id: editingAccount.id,
        openingOre: nextOpening,
        closingOre: nextClosing,
      });
      const result = await saveBalanceAdjustment({
        companyId,
        accountId: editingAccount.id,
        contraAccountId: edit.contraId,
        kind: edit.kind,
        newOre: nextOre,
      });
      if (!result.ok) {
        setOptimistic({
          type: "balance",
          id: editingAccount.id,
          openingOre: editingAccount.openingOre,
          closingOre: editingAccount.closingOre,
        });
        setError(result.error);
        return;
      }
      setEdit(null);
    });
  }

  const contraAccounts = searchableAccounts.filter(
    (account) => account.id !== edit?.accountId
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
        kontosöket. Momskod följer med vid kontering och kan ändras där.
        Klicka på ett belopp för att ändra saldo.
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
              <th className="w-44 px-4 py-3.5 font-medium">Momskod</th>
              <th className="w-36 px-4 py-3.5 text-right font-medium">
                Ingående saldo
              </th>
              <th className="w-36 px-4 py-3.5 text-right font-medium">
                Utgående saldo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((account) => {
              const isEditing = edit?.accountId === account.id;
              return (
                <AccountRow
                  key={account.id}
                  companyId={companyId}
                  account={account}
                  edit={isEditing ? edit : null}
                  diffOre={isEditing ? diffOre : null}
                  remainingOre={isEditing ? remainingOre : 0}
                  canSave={isEditing && canSave}
                  contraAccounts={contraAccounts}
                  onToggle={toggle}
                  onVatChange={setVat}
                  onStartEdit={startEdit}
                  onDraftChange={(draft) =>
                    setEdit((current) =>
                      current ? { ...current, draft } : current
                    )
                  }
                  onContraQuery={(contraQuery) =>
                    setEdit((current) =>
                      current
                        ? { ...current, contraQuery, contraId: "" }
                        : current
                    )
                  }
                  onContraSelect={(contra) =>
                    setEdit((current) =>
                      current
                        ? {
                            ...current,
                            contraId: contra?.id ?? "",
                            contraQuery: contra
                              ? `${contra.number} ${contra.name}`
                              : current.contraQuery,
                          }
                        : current
                    )
                  }
                  onCancel={cancelEdit}
                  onSave={saveEdit}
                />
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
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

function AccountRow({
  companyId,
  account,
  edit,
  diffOre,
  remainingOre,
  canSave,
  contraAccounts,
  onToggle,
  onVatChange,
  onStartEdit,
  onDraftChange,
  onContraQuery,
  onContraSelect,
  onCancel,
  onSave,
}: {
  companyId: string;
  account: ChartAccount;
  edit: EditState | null;
  diffOre: number | null;
  remainingOre: number;
  canSave: boolean;
  contraAccounts: Account[];
  onToggle: (account: ChartAccount, active: boolean) => void;
  onVatChange: (account: ChartAccount, vatCode: string | null) => void;
  onStartEdit: (account: ChartAccount, kind: BalanceKind) => void;
  onDraftChange: (draft: string) => void;
  onContraQuery: (query: string) => void;
  onContraSelect: (account: Account | null) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const muted = account.active ? "" : "text-neutral-400";
  const showPanel = Boolean(edit && diffOre != null && diffOre !== 0);

  return (
    <>
      <tr className={account.active ? "" : "bg-neutral-50"}>
        <td className="px-4 py-2.5">
          <input
            type="checkbox"
            checked={account.active}
            onChange={(event) => onToggle(account, event.target.checked)}
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
        <td className="px-4 py-2.5">
          <VatCodeSelect
            value={account.vatCode ?? ""}
            ariaLabel={`Momskod ${account.number} ${account.name}`}
            onChange={(code) => onVatChange(account, code || null)}
          />
        </td>
        <td className={`px-4 py-2.5 text-right tabular-nums ${muted}`}>
          <BalanceCell
            label={`Ingående saldo ${account.number}`}
            value={account.openingOre}
            editing={edit?.kind === "opening"}
            draft={edit?.kind === "opening" ? edit.draft : ""}
            onStart={() => onStartEdit(account, "opening")}
            onDraftChange={onDraftChange}
            onCancel={onCancel}
          />
        </td>
        <td className={`px-4 py-2.5 text-right tabular-nums ${muted}`}>
          <BalanceCell
            label={`Utgående saldo ${account.number}`}
            value={account.closingOre}
            editing={edit?.kind === "closing"}
            draft={edit?.kind === "closing" ? edit.draft : ""}
            onStart={() => onStartEdit(account, "closing")}
            onDraftChange={onDraftChange}
            onCancel={onCancel}
          />
        </td>
      </tr>
      {showPanel && edit ? (
        <tr className="bg-neutral-50/80">
          <td colSpan={6} className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <p className="text-xs text-neutral-500">
                  {edit.kind === "opening"
                    ? "Ändring av ingående saldo"
                    : "Ändring av utgående saldo"}
                  {` · ${account.number} ${account.name}`}
                </p>
                <p className="mt-1 text-sm tabular-nums text-neutral-800">
                  Differens {formatOre(diffOre ?? 0)}
                </p>
              </div>
              <label className="min-w-[18rem] flex-1 text-xs text-neutral-500">
                Motkonto
                <div className="mt-1 rounded-lg border border-neutral-300 bg-white">
                  <AccountSearch
                    companyId={companyId}
                    accounts={contraAccounts}
                    query={edit.contraQuery}
                    selectedId={edit.contraId}
                    onQueryChange={onContraQuery}
                    onSelect={onContraSelect}
                    onCommit={() => undefined}
                  />
                </div>
              </label>
              <div>
                <p className="text-xs text-neutral-500">Diff</p>
                <p
                  className={`mt-1 text-sm tabular-nums ${
                    remainingOre === 0
                      ? "text-neutral-800"
                      : "font-medium text-red-700"
                  }`}
                >
                  {formatOre(remainingOre)}
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800 transition hover:bg-neutral-50"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  disabled={!canSave}
                  onClick={onSave}
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Spara
                </button>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function BalanceCell({
  label,
  value,
  editing,
  draft,
  onStart,
  onDraftChange,
  onCancel,
}: {
  label: string;
  value: number;
  editing: boolean;
  draft: string;
  onStart: () => void;
  onDraftChange: (draft: string) => void;
  onCancel: () => void;
}) {
  if (!editing) {
    return (
      <button
        type="button"
        onClick={onStart}
        aria-label={label}
        className="w-full rounded-md px-1 py-0.5 text-right tabular-nums transition hover:bg-neutral-100"
      >
        {formatOre(value)}
      </button>
    );
  }

  return (
    <input
      aria-label={label}
      inputMode="decimal"
      autoFocus
      value={draft}
      onChange={(event) => onDraftChange(event.target.value)}
      onBlur={(event) => onDraftChange(completeAmountDecimals(event.target.value))}
      onFocus={(event) => event.target.select()}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      className="w-full rounded-md border border-neutral-300 bg-white px-1.5 py-0.5 text-right tabular-nums text-neutral-900 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
    />
  );
}
