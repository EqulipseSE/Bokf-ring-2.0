"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Account } from "@/lib/db/schema";
import { formatOre, formatOreInput, parseAmountToOre } from "@/lib/money";
import { parseVoucherDate } from "@/lib/voucher-date";
import { AccountSearch } from "./account-search";
import { saveVoucher } from "./actions";

type LineDraft = {
  key: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  debit: string;
  credit: string;
};

type VoucherFormProps = {
  companyId: string;
  accounts: Account[];
  defaultDate: string;
  nextNumberLabel: string;
};

function createLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    accountId: "",
    accountNumber: "",
    accountName: "",
    debit: "",
    credit: "",
  };
}

function emptyLines(count: number): LineDraft[] {
  return Array.from({ length: count }, createLine);
}

function isLineEmpty(line: LineDraft): boolean {
  return (
    !line.accountId &&
    !line.accountNumber.trim() &&
    !line.debit.trim() &&
    !line.credit.trim()
  );
}

function sumLines(lines: LineDraft[]): { debit: number; credit: number } {
  return lines.reduce(
    (sums, line) => {
      const debit = parseAmountToOre(line.debit) ?? 0;
      const credit = parseAmountToOre(line.credit) ?? 0;
      return { debit: sums.debit + debit, credit: sums.credit + credit };
    },
    { debit: 0, credit: 0 }
  );
}

const fieldClass =
  "h-8 border border-neutral-300 bg-white px-2 text-sm text-neutral-900 outline-none focus:ring-1 focus:ring-neutral-400";
const cellInputClass =
  "h-8 w-full bg-transparent px-2 py-1 text-sm text-neutral-900 outline-none focus:bg-white focus:ring-1 focus:ring-neutral-400";

export function VoucherForm({
  companyId,
  accounts,
  defaultDate,
  nextNumberLabel,
}: VoucherFormProps) {
  const [numberLabel, setNumberLabel] = useState(nextNumberLabel);
  const [dateInput, setDateInput] = useState(defaultDate);
  const [anchorDate, setAnchorDate] = useState(defaultDate);
  const [dateError, setDateError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => emptyLines(8));
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dateRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const accountRefs = useRef<Array<HTMLInputElement | null>>([]);
  const debitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const creditRefs = useRef<Array<HTMLInputElement | null>>([]);

  const totals = sumLines(lines);
  const difference = totals.debit - totals.credit;
  const readyLines = lines.filter((line) => !isLineEmpty(line));
  const balanced =
    difference === 0 &&
    totals.debit > 0 &&
    readyLines.length >= 2 &&
    readyLines.every((line) => line.accountId);
  const listHref = `/foretag/${companyId}/verifikationer`;

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) =>
      withTrailingEmpty(
        prev.map((line, i) => (i === index ? { ...line, ...patch } : line))
      )
    );
  }

  function applyAccount(index: number, account: Account | null) {
    setLines((prev) => {
      const current = prev[index];
      if (!current) return prev;
      const remainder = remainderSuggestion(prev, index);
      return withTrailingEmpty(
        prev.map((line, i) =>
          i === index
            ? {
                ...line,
                accountId: account?.id ?? "",
                accountNumber: account?.number ?? line.accountNumber,
                accountName: account?.name ?? "",
                debit: line.debit || remainder.debit,
                credit: line.credit || remainder.credit,
              }
            : line
        )
      );
    });
  }

  function focusAmountAfterAccount(index: number) {
    const remainder = remainderSuggestion(lines, index);
    window.requestAnimationFrame(() => {
      if (remainder.credit) {
        creditRefs.current[index]?.focus();
        creditRefs.current[index]?.select();
      } else {
        debitRefs.current[index]?.focus();
        debitRefs.current[index]?.select();
      }
    });
  }

  function focusNextAccount(index: number) {
    window.requestAnimationFrame(() => {
      const next = accountRefs.current[index + 1];
      if (next) {
        next.focus();
        next.select();
      }
    });
  }

  function resolvedDate(): string | null {
    const parsed = parseVoucherDate(dateInput, anchorDate);
    if (!parsed.ok) {
      setDateError(parsed.error);
      return null;
    }
    setDateInput(parsed.iso);
    setAnchorDate(parsed.iso);
    setDateError(null);
    return parsed.iso;
  }

  function commitDate(): boolean {
    return resolvedDate() !== null;
  }

  function submit() {
    if (pending) return;
    const isoDate = resolvedDate();
    if (!isoDate) return;
    if (!balanced) return;
    setError(null);
    const payloadLines = lines
      .filter((line) => !isLineEmpty(line))
      .map((line) => ({
        accountId: line.accountId,
        debitOre: parseAmountToOre(line.debit) ?? 0,
        creditOre: parseAmountToOre(line.credit) ?? 0,
      }));

    startTransition(async () => {
      const result = await saveVoucher({
        companyId,
        date: isoDate,
        text,
        lines: payloadLines,
      });
      if (!result.ok) {
        setError(result.error);
        setSavedLabel(null);
        return;
      }
      setSavedLabel(result.numberLabel);
      setNumberLabel(result.nextNumberLabel);
      setDateInput(isoDate);
      setAnchorDate(isoDate);
      setText("");
      setLines(emptyLines(8));
      setError(null);
      window.requestAnimationFrame(() => textRef.current?.focus());
    });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <Link
        href={listHref}
        className="text-sm text-neutral-500 transition hover:text-neutral-900"
      >
        ← Tillbaka till verifikationer
      </Link>

      <div className="mt-3 mb-4 flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          Verifikation
        </h1>
        {savedLabel ? (
          <p role="status" className="text-sm font-medium text-emerald-800">
            {savedLabel} sparad
          </p>
        ) : null}
      </div>

      <div className="border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b border-neutral-200 px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <span className="w-28 shrink-0">Ver.nr</span>
            <input
              value={numberLabel}
              readOnly
              tabIndex={-1}
              aria-label="Verifikationsnummer"
              className={`${fieldClass} w-24 bg-neutral-50 tabular-nums text-neutral-700`}
            />
          </label>
          <div>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <span className="w-16 shrink-0">Datum</span>
              <input
                ref={dateRef}
                id="voucher-date"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={dateInput}
                onChange={(event) => {
                  setDateInput(event.target.value);
                  setDateError(null);
                }}
                onBlur={commitDate}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (commitDate()) textRef.current?.focus();
                  }
                }}
                aria-invalid={dateError ? true : undefined}
                className={`${fieldClass} w-32 tabular-nums ${dateError ? "border-red-500" : ""}`}
              />
            </label>
            {dateError ? (
              <p role="alert" className="mt-1 ml-[4.5rem] text-xs text-red-700">
                {dateError}
              </p>
            ) : null}
          </div>
          <label className="flex min-w-[16rem] flex-1 items-center gap-2 text-sm text-neutral-700">
            <span className="shrink-0">Verifikationstext</span>
            <input
              id="voucher-text"
              ref={textRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  accountRefs.current[0]?.focus();
                }
              }}
              className={`${fieldClass} min-w-0 flex-1`}
            />
          </label>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-100 text-left text-xs font-medium text-neutral-600">
              <th className="w-24 px-2 py-2">Konto</th>
              <th className="px-2 py-2">Benämning</th>
              <th className="w-32 px-2 py-2 text-right">Debet</th>
              <th className="w-32 px-2 py-2 text-right">Kredit</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.key} className="border-b border-neutral-100">
                <td className="p-0 align-top">
                  <AccountSearch
                    accounts={accounts}
                    query={line.accountNumber}
                    selectedId={line.accountId}
                    inputRef={(el) => {
                      accountRefs.current[index] = el;
                    }}
                    onQueryChange={(accountNumber) =>
                      updateLine(index, {
                        accountNumber,
                        accountId: "",
                        accountName: "",
                      })
                    }
                    onSelect={(account) => {
                      if (!account) {
                        updateLine(index, { accountId: "", accountName: "" });
                        return;
                      }
                      applyAccount(index, account);
                    }}
                    onCommit={() => focusAmountAfterAccount(index)}
                  />
                </td>
                <td className="p-0 align-middle">
                  <input
                    tabIndex={-1}
                    readOnly
                    value={line.accountName}
                    aria-label={`Benämning rad ${index + 1}`}
                    className={`${cellInputClass} text-neutral-600`}
                  />
                </td>
                <td className="p-0 align-top">
                  <input
                    ref={(el) => {
                      debitRefs.current[index] = el;
                    }}
                    inputMode="decimal"
                    value={line.debit}
                    aria-label={`Debet rad ${index + 1}`}
                    onChange={(event) =>
                      updateLine(index, { debit: event.target.value, credit: "" })
                    }
                    onFocus={(event) => {
                      if (!line.debit && !line.credit) {
                        const suggestion = remainderSuggestion(lines, index);
                        if (suggestion.debit) {
                          updateLine(index, { debit: suggestion.debit, credit: "" });
                        }
                      }
                      event.target.select();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (line.debit.trim()) {
                          focusNextAccount(index);
                        } else {
                          creditRefs.current[index]?.focus();
                        }
                      }
                      if (event.key === "Tab" && !event.shiftKey && line.debit.trim()) {
                        event.preventDefault();
                        focusNextAccount(index);
                      }
                    }}
                    className={`${cellInputClass} text-right tabular-nums`}
                  />
                </td>
                <td className="p-0 align-top">
                  <input
                    ref={(el) => {
                      creditRefs.current[index] = el;
                    }}
                    inputMode="decimal"
                    value={line.credit}
                    aria-label={`Kredit rad ${index + 1}`}
                    onChange={(event) =>
                      updateLine(index, { credit: event.target.value, debit: "" })
                    }
                    onFocus={(event) => {
                      if (!line.debit && !line.credit) {
                        const suggestion = remainderSuggestion(lines, index);
                        if (suggestion.credit) {
                          updateLine(index, { debit: "", credit: suggestion.credit });
                        }
                      }
                      event.target.select();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        focusNextAccount(index);
                      }
                    }}
                    className={`${cellInputClass} text-right tabular-nums`}
                  />
                </td>
              </tr>
            ))}
            <tr className="border-t border-neutral-200 bg-neutral-50 text-sm">
              <td colSpan={2} className="px-2 py-2 text-neutral-600">
                Summa
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-neutral-900">
                {formatOre(totals.debit)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-neutral-900">
                {formatOre(totals.credit)}
              </td>
            </tr>
            <tr className="text-sm">
              <td colSpan={2} className="px-2 py-2 text-neutral-600">
                Diff
              </td>
              <td />
              <td
                className={`px-2 py-2 text-right tabular-nums ${
                  difference === 0 ? "text-neutral-900" : "font-medium text-red-700"
                }`}
              >
                {formatOre(Math.abs(difference))}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3">
          <p className="text-xs text-neutral-400">
            Tab: konto → debet → kredit. Restbelopp föreslås på nästa rad. Ctrl+S
            registrerar när diff är 0.
          </p>
          <button
            type="button"
            disabled={!balanced || pending || Boolean(dateError)}
            onClick={submit}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Sparar…" : "Registrera"}
          </button>
        </div>

        {error ? (
          <p role="alert" className="px-4 pb-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function withTrailingEmpty(lines: LineDraft[]): LineDraft[] {
  const last = lines[lines.length - 1];
  if (!last || !isLineEmpty(last)) return [...lines, createLine()];
  return lines;
}

function remainderSuggestion(
  lines: LineDraft[],
  index: number
): { debit: string; credit: string } {
  const others = lines.filter((_, i) => i !== index);
  const { debit, credit } = sumLines(others);
  const remainder = debit - credit;
  if (remainder > 0) return { debit: "", credit: formatOreInput(remainder) };
  if (remainder < 0) return { debit: formatOreInput(-remainder), credit: "" };
  return { debit: "", credit: "" };
}
