"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createAccount,
  updateAccount,
} from "@/app/foretag/[id]/kundfakturor/ny/account-actions";
import type { Account } from "@/lib/db/schema";
import { VAT_CODES } from "@/lib/vat-codes";

type AccountSearchProps = {
  companyId: string;
  accounts: Account[];
  query: string;
  selectedId: string;
  onQueryChange: (query: string) => void;
  onSelect: (account: Account | null) => void;
  onCommit: () => void;
  /** Tomt kontofält + Enter. Returnera true om tangenten är hanterad. */
  onBlankEnter?: () => boolean;
  onFocusLine?: () => void;
  /** Tomt kontofält som lämnas. Summan ska då tas bort. */
  onEmptyBlur?: () => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  /** Ifylld ruta. I konteringsraden lämnas fältet utan ram. */
  boxed?: boolean;
  /** Liten pil som öppnar kontolistan. */
  arrow?: boolean;
};

export function AccountSearch({
  companyId,
  accounts,
  query,
  selectedId,
  onQueryChange,
  onSelect,
  onCommit,
  onBlankEnter,
  onFocusLine,
  onEmptyBlur,
  inputRef,
  boxed = false,
  arrow = false,
}: AccountSearchProps) {
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editor, setEditor] = useState<null | {
    mode: "new" | "edit";
    accountId: string | null;
    number: string;
    name: string;
    vatCode: string;
  }>(null);
  const selected = accounts.find((account) => account.id === selectedId);

  const matches = useMemo(
    () => (browse ? accounts.slice(0, 30) : filterAccounts(accounts, query)),
    [accounts, browse, query]
  );

  useEffect(() => {
    if (!open) return;
    const item = listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [highlight, open, matches.length]);

  function choose(account: Account) {
    onSelect(account);
    setOpen(false);
    onCommit();
  }

  function commitCurrent() {
    if (!query.trim() && onBlankEnter?.()) {
      setOpen(false);
      return;
    }
    const exact = exactAccount(accounts, query);
    if (exact) {
      choose(exact);
      return;
    }
    const highlighted = matches[highlight];
    if (highlighted) {
      choose(highlighted);
      return;
    }
    if (selectedId) {
      setOpen(false);
      onCommit();
    }
  }

  async function saveAccount() {
    if (!editor || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const input = { number: editor.number, name: editor.name, vatCode: editor.vatCode };
      const result =
        editor.mode === "new" || !editor.accountId
          ? await createAccount(companyId, input)
          : await updateAccount(companyId, editor.accountId, input);
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      const account: Account = {
        id: result.account.id,
        companyId,
        number: result.account.number,
        name: result.account.name,
        vatCode: result.account.vatCode,
        active: true,
      };
      onQueryChange(account.number);
      onSelect(account);
      setEditor(null);
      setOpen(false);
      router.refresh();
      onCommit();
    } catch {
      setSaveError("Kontot kunde inte sparas.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "h-8 w-full border border-neutral-300 bg-white px-2 text-sm text-neutral-900 outline-none";

  const highlighted = matches[highlight];

  return (
    <div className="relative">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Konto"
        autoComplete="off"
        value={query}
        onChange={(event) => {
          const value = event.target.value;
          onQueryChange(value);
          onSelect(null);
          setHighlight(0);
          setBrowse(false);
          setOpen(value.trim().length > 0);
        }}
        onFocus={(event) => {
          event.target.select();
          onFocusLine?.();
        }}
        onMouseUp={(event) => event.preventDefault()}
        onBlur={(event) => {
          const value = event.currentTarget.value;
          window.setTimeout(() => {
            setOpen(false);
            setBrowse(false);
            if (!value.trim()) onEmptyBlur?.();
          }, 120);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!query.trim()) return;
            setOpen(true);
            setHighlight((index) => Math.min(index + 1, Math.max(matches.length - 1, 0)));
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((index) => Math.max(index - 1, 0));
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            commitCurrent();
            return;
          }
          if (event.key === "Tab" && !event.shiftKey && (query.trim() || selectedId)) {
            const exact = exactAccount(accounts, query);
            const highlighted = matches[highlight];
            if (exact) {
              onSelect(exact);
              setOpen(false);
            } else if (!selectedId && highlighted) {
              onSelect(highlighted);
              setOpen(false);
            } else {
              setOpen(false);
            }
          }
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={
          boxed
            ? `h-8 w-full border border-neutral-300 bg-white text-center font-mono text-sm tabular-nums text-neutral-900 outline-none focus:ring-1 focus:ring-neutral-400 ${arrow ? "pr-5 pl-1" : "px-1.5"}`
            : "h-8 w-full bg-transparent px-2 py-1 font-mono text-sm tabular-nums text-neutral-900 outline-none focus:bg-white focus:ring-1 focus:ring-neutral-400"
        }
      />
      {arrow ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Byt konto"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setBrowse(true);
            setHighlight(0);
            setOpen(true);
          }}
          className="absolute top-1/2 right-1 -translate-y-1/2 text-neutral-500"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
      {open ? (
        <div className="absolute top-full left-0 z-20 mt-0.5 min-w-[22rem] border border-neutral-200 bg-white shadow-md">
          <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600">
            <div className="flex w-14 shrink-0 items-center">
              <HintButton label="Redigera" ariaLabel="Redigera konto" onClick={() => {
                setSaveError(null);
                setEditor({
                  mode: "edit",
                  accountId: highlighted?.id ?? selected?.id ?? null,
                  number: highlighted?.number ?? selected?.number ?? query,
                  name: highlighted?.name ?? selected?.name ?? "",
                  vatCode: highlighted?.vatCode ?? selected?.vatCode ?? "",
                });
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
              </HintButton>
              <HintButton label="Ny" ariaLabel="Nytt konto" onClick={() => {
                setSaveError(null);
                setEditor({ mode: "new", accountId: null, number: "", name: "", vatCode: "" });
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-4 w-4" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </HintButton>
            </div>
            <span className="w-12 shrink-0">Konto</span>
            <span className="min-w-0 flex-1">Benämning</span>
          </div>
          <ul id={listId} ref={listRef} role="listbox" className="max-h-56 overflow-y-auto">
            {matches.length === 0 ? (
              <li className="px-2.5 py-1.5 text-sm text-neutral-500">Ingen träff.</li>
            ) : (
              matches.map((account, index) => {
                const active = index === highlight;
                return (
                  <li key={account.id} role="option" aria-selected={account.id === selectedId} data-index={index}>
                    <button
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        choose(account);
                      }}
                      onMouseEnter={() => setHighlight(index)}
                      className={`flex h-8 w-full items-center gap-3 px-2.5 text-left text-sm ${
                        active ? "bg-neutral-100" : ""
                      }`}
                    >
                      <span className="w-14 shrink-0" />
                      <span className="w-12 shrink-0 font-mono tabular-nums text-neutral-500">
                        {account.number}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-neutral-900">{account.name}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
      {editor
        ? createPortal(
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/30 p-4">
              <div role="dialog" aria-modal="true" className="w-full max-w-md border border-neutral-200 bg-white shadow-lg">
                <div className="border-b border-neutral-200 px-4 py-2.5">
                  <h2 className="text-sm font-medium text-neutral-900">
                    {editor.mode === "new" ? "Nytt konto" : "Redigera konto"}
                  </h2>
                </div>
                <div className="grid gap-3 px-4 py-3">
                  <label className="grid gap-1 text-xs text-neutral-600">
                    Kontonummer
                    <input
                      autoFocus
                      value={editor.number}
                      onChange={(event) =>
                        setEditor({ ...editor, number: event.target.value.replace(/\D/g, "") })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-neutral-600">
                    Benämning
                    <input
                      value={editor.name}
                      onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                      className={fieldClass}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-neutral-600">
                    Momskod
                    <select
                      value={editor.vatCode}
                      onChange={(event) => setEditor({ ...editor, vatCode: event.target.value })}
                      className={fieldClass}
                    >
                      <option value="">—</option>
                      {VAT_CODES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.code} · {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {saveError ? <p className="text-sm text-red-700">{saveError}</p> : null}
                </div>
                <div className="flex justify-end gap-2 border-t border-neutral-200 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setEditor(null)}
                    className="h-8 border border-neutral-300 bg-white px-3 text-sm"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveAccount()}
                    className="h-8 bg-neutral-900 px-3 text-sm text-white disabled:opacity-50"
                  >
                    Spara
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function HintButton({
  label,
  ariaLabel,
  onClick,
  children,
}: {
  label: string;
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <span className="group relative">
      <button
        type="button"
        aria-label={ariaLabel}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        className="flex h-6 w-6 items-center justify-center rounded text-neutral-700 hover:bg-neutral-200 hover:text-neutral-950"
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-0 z-30 mt-1 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

function filterAccounts(accounts: Account[], query: string): Account[] {
  const q = query.trim();
  if (!q) return accounts.slice(0, 12);
  if (/^\d+$/.test(q)) {
    return accounts.filter((account) => account.number.startsWith(q));
  }
  const name = q.toLocaleLowerCase("sv");
  return accounts.filter(
    (account) =>
      account.number.startsWith(q) || account.name.toLocaleLowerCase("sv").includes(name)
  );
}

function exactAccount(accounts: Account[], query: string): Account | undefined {
  const q = query.trim().toLocaleLowerCase("sv");
  if (!q) return undefined;
  return accounts.find(
    (account) =>
      account.number === q ||
      account.name.toLocaleLowerCase("sv") === q ||
      `${account.number} ${account.name}`.toLocaleLowerCase("sv") === q
  );
}
