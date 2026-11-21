"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { matchesQuery } from "@/lib/search";
import { completeAmountDecimals } from "@/lib/money";
import { VAT_CODES } from "@/lib/vat-codes";
import { createAccount, updateAccount } from "./account-actions";
import { createArticle, updateArticle } from "./article-actions";

export type ArticleAccountOption = {
  id: string;
  number: string;
  name: string;
  vatCode: string | null;
};

export type ArticleDraft = {
  number: string;
  name: string;
  unit: string;
  unitPrice: string;
  accountNumber: string;
  vatCode: string;
};

function priceDigits(value: string): string {
  const cleaned = value.replace(/[^\d,.]/g, "");
  const match = cleaned.match(/^(\d*)([,.])?(\d*)/);
  if (!match) return "";
  return `${match[1] ?? ""}${match[2] ?? ""}${match[3] ?? ""}`;
}

const UNITS = [
  { id: "St", label: "Styck" },
  { id: "Tim", label: "Timmar" },
] as const;

export const emptyArticleDraft = (): ArticleDraft => ({
  number: "",
  name: "",
  unit: "",
  unitPrice: "",
  accountNumber: "",
  vatCode: "",
});

export function ArticleDialog({
  mode,
  articleId,
  draft,
  accounts,
  accountNumbers,
  companyId,
  onChange,
  onSaved,
  onClose,
}: {
  mode: "new" | "edit";
  articleId: string | null;
  draft: ArticleDraft;
  accounts: ArticleAccountOption[];
  accountNumbers: string[];
  companyId: string;
  onChange: (draft: ArticleDraft) => void;
  onSaved: (article: {
    id: string;
    number: string;
    name: string;
    unit: string;
    unitPrice: string;
    accountNumber: string;
    vatCode: string;
  }) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const title = mode === "new" ? "Ny artikel" : "Redigera artikel";
  const fieldClass =
    "h-7 w-full min-w-0 border border-neutral-300 bg-white px-2 text-sm text-neutral-900 outline-none focus:ring-1 focus:ring-neutral-400";

  async function save() {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const result =
        mode === "new" || !articleId
          ? await createArticle(companyId, draft)
          : await updateArticle(companyId, articleId, draft);
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      onSaved(result.article);
      router.refresh();
    } catch {
      setSaveError("Artikeln kunde inte sparas.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/30 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md border border-neutral-200 bg-white shadow-lg"
      >
        <div className="border-b border-neutral-200 px-4 py-2.5">
          <h2 id={titleId} className="text-sm font-medium text-neutral-900">
            {title}
          </h2>
        </div>
        <div className="grid gap-3 px-4 py-3">
          <label className="grid gap-1 text-xs text-neutral-600">
            Artikelnummer
            <input
              autoFocus
              inputMode="numeric"
              value={draft.number}
              onChange={(event) =>
                onChange({
                  ...draft,
                  number: event.target.value.replace(/\D/g, ""),
                })
              }
              className={fieldClass}
            />
          </label>
          <label className="grid gap-1 text-xs text-neutral-600">
            Benämning
            <input
              value={draft.name}
              onChange={(event) =>
                onChange({ ...draft, name: event.target.value })
              }
              className={fieldClass}
            />
          </label>
          <div className="grid gap-1 text-xs text-neutral-600">
            Enhet
            <div className="flex gap-2">
              {UNITS.map((unit) => {
                const selected = draft.unit === unit.id;
                return (
                  <button
                    key={unit.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ ...draft, unit: unit.id })}
                    className={`h-7 flex-1 border text-sm ${
                      selected
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
                    }`}
                  >
                    {unit.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="grid gap-1 text-xs text-neutral-600">
            Enhetspris
            <input
              inputMode="decimal"
              value={draft.unitPrice}
              onChange={(event) =>
                onChange({ ...draft, unitPrice: priceDigits(event.target.value) })
              }
              onBlur={(event) =>
                onChange({ ...draft, unitPrice: completeAmountDecimals(event.target.value) })
              }
              className={fieldClass}
            />
          </label>
          <div className="grid gap-1 text-xs text-neutral-600">
            Bokföringskonto
            <AccountSearch
              accounts={accounts}
              accountNumbers={accountNumbers}
              companyId={companyId}
              number={draft.accountNumber}
              className={fieldClass}
              onPick={(account) =>
                onChange({
                  ...draft,
                  accountNumber: account?.number ?? "",
                  vatCode: account?.vatCode ?? "",
                })
              }
            />
          </div>
          <label className="grid gap-1 text-xs text-neutral-600">
            Momskod
            <select
              value={draft.vatCode}
              onChange={(event) =>
                onChange({ ...draft, vatCode: event.target.value })
              }
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
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-2.5">
          {saveError ? (
            <p className="mr-auto text-xs text-red-700">{saveError}</p>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="h-7 border border-neutral-300 bg-white px-3 text-sm text-neutral-800 hover:bg-neutral-50"
          >
            Avbryt
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="h-7 bg-neutral-900 px-3 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            Spara
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AccountSearch({
  accounts,
  accountNumbers,
  companyId,
  number,
  className,
  onPick,
}: {
  accounts: ArticleAccountOption[];
  accountNumbers: string[];
  companyId: string;
  number: string;
  className: string;
  onPick: (account: ArticleAccountOption | null) => void;
}) {
  const listId = useId();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [accountEditor, setAccountEditor] = useState<null | {
    mode: "new" | "edit";
    accountId: string | null;
    number: string;
    name: string;
    vatCode: string;
  }>(null);
  const selected = accounts.find((account) => account.number === number);
  const [text, setText] = useState(
    selected ? `${selected.number} ${selected.name}` : ""
  );
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected || document.activeElement === inputRef.current) return;
    setText(`${selected.number} ${selected.name}`);
  }, [selected]);

  const matches = useMemo(() => {
    const source = text.trim()
      ? accounts.filter((account) =>
          matchesQuery([account.number, account.name], text)
        )
      : accounts;
    return source.slice(0, 30);
  }, [accounts, text]);

  function choose(account: ArticleAccountOption) {
    setText(`${account.number} ${account.name}`);
    setOpen(false);
    onPick(account);
  }

  async function saveAccount() {
    if (!accountEditor || saving) return;
    setSaving(true);
    setSaveError(null);
    const input = {
      number: accountEditor.number,
      name: accountEditor.name,
      vatCode: accountEditor.vatCode,
    };
    try {
      const result =
        accountEditor.mode === "new" || !accountEditor.accountId
          ? await createAccount(companyId, input)
          : await updateAccount(companyId, accountEditor.accountId, input);
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      setText(`${result.account.number} ${result.account.name}`);
      onPick(result.account);
      setAccountEditor(null);
      router.refresh();
    } catch {
      setSaveError("Kontot kunde inte sparas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-1">
      <div className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="Bokföringskonto"
        autoComplete="off"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setHighlight(0);
          setOpen(true);
          if (number) onPick(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
            setHighlight((index) =>
              Math.min(index + 1, Math.max(matches.length - 1, 0))
            );
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlight((index) => Math.max(index - 1, 0));
            return;
          }
          if (event.key === "Enter" && open && matches[highlight]) {
            event.preventDefault();
            choose(matches[highlight]);
            return;
          }
          if (event.key === "Escape" && open) {
            event.stopPropagation();
            setOpen(false);
          }
        }}
        className={className}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-0.5 max-h-64 w-full overflow-auto border border-neutral-200 bg-white py-1 shadow-md"
        >
          {matches.length === 0 ? (
            <li className="px-2.5 py-1.5 text-sm text-neutral-500">Ingen träff.</li>
          ) : (
            matches.map((account, index) => (
              <li key={account.number} role="option" aria-selected={index === highlight}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    choose(account);
                  }}
                  onMouseEnter={() => setHighlight(index)}
                  className={`flex w-full items-baseline gap-3 px-2.5 py-1.5 text-left text-sm ${
                    index === highlight ? "bg-neutral-100" : ""
                  }`}
                >
                  <span className="w-12 shrink-0 font-mono tabular-nums text-neutral-500">
                    {account.number}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-neutral-900">
                    {account.name}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
      </div>
      <button
        type="button"
        aria-label="Redigera konto"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setSaveError(null);
          setAccountEditor({
            mode: "edit",
            accountId: selected?.id ?? null,
            number: selected?.number ?? "",
            name: selected?.name ?? "",
            vatCode: selected?.vatCode ?? "",
          });
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Nytt konto"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setSaveError(null);
          setAccountEditor({
            mode: "new",
            accountId: null,
            number: "",
            name: "",
            vatCode: "",
          });
        }}
        className="flex h-7 w-7 shrink-0 items-center justify-center border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-4 w-4" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      {accountEditor
        ? createPortal(
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-900/30 p-4">
              <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-md border border-neutral-200 bg-white shadow-lg"
              >
                <div className="border-b border-neutral-200 px-4 py-2.5">
                  <h2 className="text-sm font-medium text-neutral-900">
                    {accountEditor.mode === "new" ? "Nytt konto" : "Redigera konto"}
                  </h2>
                </div>
                <div className="grid gap-3 px-4 py-3">
                  <label className="grid gap-1 text-xs text-neutral-600">
                    <span className="flex items-baseline gap-2">
                      Kontonummer
                      {accountEditor.mode === "new" && accountEditor.number ? (
                        <span className="font-normal text-neutral-500">
                          {accountNumbers.includes(accountEditor.number)
                            ? "Kontot finns redan"
                            : "Kontot är ledigt"}
                        </span>
                      ) : null}
                    </span>
                    <input
                      autoFocus
                      value={accountEditor.number}
                      onChange={(event) =>
                        setAccountEditor({
                          ...accountEditor,
                          number: event.target.value.replace(/\D/g, ""),
                        })
                      }
                      className={className}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-neutral-600">
                    Benämning
                    <input
                      value={accountEditor.name}
                      onChange={(event) =>
                        setAccountEditor({ ...accountEditor, name: event.target.value })
                      }
                      className={className}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-neutral-600">
                    Momskod
                    <select
                      value={accountEditor.vatCode}
                      onChange={(event) =>
                        setAccountEditor({
                          ...accountEditor,
                          vatCode: event.target.value,
                        })
                      }
                      className={className}
                    >
                      <option value="">—</option>
                      {VAT_CODES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.code} · {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {saveError ? (
                    <p className="text-sm text-red-700">{saveError}</p>
                  ) : null}
                </div>
                <div className="flex justify-end gap-2 border-t border-neutral-200 px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setAccountEditor(null)}
                    className="h-7 border border-neutral-300 bg-white px-3 text-sm text-neutral-800 hover:bg-neutral-50"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveAccount()}
                    className="h-7 bg-neutral-900 px-3 text-sm text-white hover:bg-neutral-800 disabled:opacity-50"
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
