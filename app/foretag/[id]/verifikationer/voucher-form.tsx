"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Account } from "@/lib/db/schema";
import { formatOre, formatOreInput, parseAmountToOre } from "@/lib/money";
import { AccountSearch } from "./account-search";
import { saveVoucher } from "./actions";

type LineDraft = {
  key: string;
  accountId: string;
  query: string;
  debit: string;
  credit: string;
};

type VoucherFormProps = {
  companyId: string;
  accounts: Account[];
  defaultDate: string;
};

function createLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    accountId: "",
    query: "",
    debit: "",
    credit: "",
  };
}

function isLineEmpty(line: LineDraft): boolean {
  return (
    !line.accountId &&
    !line.query.trim() &&
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

export function VoucherForm({
  companyId,
  accounts,
  defaultDate,
}: VoucherFormProps) {
  const [date, setDate] = useState(defaultDate);
  const [text, setText] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [
    createLine(),
    createLine(),
  ]);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
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

  function applyRemainder(index: number, account: Account | null) {
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
                query: account ? `${account.number} ${account.name}` : line.query,
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

  function submit() {
    if (!balanced || pending) return;
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
        date,
        text,
        lines: payloadLines,
      });
      if (!result.ok) {
        setError(result.error);
        setSavedLabel(null);
        return;
      }
      setSavedLabel(result.numberLabel);
      setText("");
      setLines([createLine(), createLine()]);
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
    // submit closes over current state; rebind when it changes.
  });

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <Link
        href={listHref}
        className="text-sm text-neutral-500 transition hover:text-neutral-900"
      >
        ← Tillbaka till verifikationer
      </Link>

      <div className="mt-4 mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Ny verifikation
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Serie A · numret tilldelas när du sparar
          </p>
        </div>
        {savedLabel ? (
          <p
            role="status"
            className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800"
          >
            {savedLabel} sparad
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="voucher-date" className="text-sm font-medium text-neutral-700">
              Datum
            </label>
            <input
              id="voucher-date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  textRef.current?.focus();
                }
              }}
              className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 tabular-nums text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="voucher-text" className="text-sm font-medium text-neutral-700">
              Text
            </label>
            <input
              id="voucher-text"
              ref={textRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="T.ex. Hyra oktober"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  accountRefs.current[0]?.focus();
                }
              }}
              className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
            />
          </div>
        </div>

        <div className="mt-8 overflow-visible">
          <table className="w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-1 font-medium">Konto</th>
                <th className="w-40 px-1 text-right font-medium">Debet</th>
                <th className="w-40 px-1 text-right font-medium">Kredit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.key}>
                  <td className="px-1 align-top">
                    <AccountSearch
                      accounts={accounts}
                      query={line.query}
                      selectedId={line.accountId}
                      inputRef={(el) => {
                        accountRefs.current[index] = el;
                      }}
                      onQueryChange={(query) => updateLine(index, { query })}
                      onSelect={(account) => {
                        if (!account) {
                          updateLine(index, { accountId: "" });
                          return;
                        }
                        applyRemainder(index, account);
                      }}
                      onCommit={() => focusAmountAfterAccount(index)}
                    />
                  </td>
                  <td className="px-1 align-top">
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
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-right tabular-nums text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
                    />
                  </td>
                  <td className="px-1 align-top">
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
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-right tabular-nums text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-100 pt-6">
          <p className="text-sm tabular-nums text-neutral-600">
            Debet {formatOre(totals.debit)}
            <span className="mx-3 text-neutral-300">·</span>
            Kredit {formatOre(totals.credit)}
            <span className="mx-3 text-neutral-300">·</span>
            <span className={difference === 0 ? "text-neutral-600" : "font-medium text-red-700"}>
              Differens {formatOre(Math.abs(difference))}
            </span>
          </p>
          <button
            type="button"
            disabled={!balanced || pending}
            onClick={submit}
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Sparar…" : "Spara verifikation"}
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        ) : (
          <p className="mt-4 text-xs text-neutral-400">
            Tab mellan fälten. Restbeloppet föreslås på nästa rad. Ctrl+S sparar när
            verifikationen är i balans.
          </p>
        )}
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
