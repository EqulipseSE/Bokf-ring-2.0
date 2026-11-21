"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { DateTextInput } from "@/app/components/date-text-input";
import type { Account } from "@/lib/db/schema";
import { completeAmountDecimals, formatOre, formatOreInput, parseAmountToOre } from "@/lib/money";
import { voucherVatHint } from "@/lib/vat-check";
import { UNDERLAG_ACCEPT, validateUnderlagMeta } from "@/lib/underlag";
import { assertDateOpen, formatIsoDateSv } from "@/lib/period-lock";
import { parseVoucherDate } from "@/lib/voucher-date";
import { AccountSearch } from "./account-search";
import { nextVoucherTransaction, saveVoucher } from "./actions";
import { UnderlagPreview } from "./underlag-preview";
import {
  clearDraft,
  getWorkspace,
  persistDraftIfDirty,
  setCardTarget,
} from "./voucher-draft";

type LineDraft = {
  key: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  vatCode: string;
  debit: string;
  credit: string;
};

type VoucherFormProps = {
  companyId: string;
  accounts: Account[];
  defaultDate: string;
  nextNumberLabel: string;
  accountBalances: Record<string, number>;
  lockedThrough: string | null;
};

function createLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    accountId: "",
    accountNumber: "",
    accountName: "",
    vatCode: "",
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
const columnRule = "border-r border-neutral-300";
const firstColumn = "border-l border-neutral-300";
const headerButtonClass =
  "h-8 border border-neutral-300 bg-white px-3 text-sm text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40";

export function VoucherForm({
  companyId,
  accounts,
  defaultDate,
  nextNumberLabel,
  accountBalances,
  lockedThrough,
}: VoucherFormProps) {
  const [numberLabel, setNumberLabel] = useState(nextNumberLabel);
  const [dateInput, setDateInput] = useState(defaultDate);
  const [anchorDate, setAnchorDate] = useState(defaultDate);
  const [baselineDate, setBaselineDate] = useState(defaultDate);
  const [dateError, setDateError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => emptyLines(8));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingTransaction, startTransactionLoad] = useTransition();
  const [balances, setBalances] = useState(accountBalances);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState("application/pdf");
  const [previewName, setPreviewName] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [bankTransactionId, setBankTransactionId] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const [suggestion, setSuggestion] = useState<{
    documentId: string | null;
    postings: { accountNumber: string; debitOre: number; creditOre: number }[];
  } | null>(null);
  const [suggestionApplied, setSuggestionApplied] = useState(false);
  const [transactionNote, setTransactionNote] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const skipPersist = useRef(false);
  const accountRefs = useRef<Array<HTMLInputElement | null>>([]);
  const debitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const creditRefs = useRef<Array<HTMLInputElement | null>>([]);
  const registerRef = useRef<HTMLButtonElement>(null);
  const [hydrated, setHydrated] = useState(false);

  const totals = sumLines(lines);
  const difference = totals.debit - totals.credit;
  const readyLines = lines.filter((line) => !isLineEmpty(line));
  const balanced =
    readyLines.length > 0 &&
    difference === 0 &&
    totals.debit > 0 &&
    readyLines.every((line) => line.accountId);
  const focusedLine = focusedIndex != null ? lines[focusedIndex] : null;
  const focusedAccount = focusedLine?.accountId
    ? accounts.find((account) => account.id === focusedLine.accountId) ?? null
    : null;
  const focusedSaldo = focusedAccount ? (balances[focusedAccount.id] ?? 0) : null;

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
                vatCode: account?.vatCode ?? "",
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
    const periodCheck = assertDateOpen(parsed.iso, lockedThrough);
    if (!periodCheck.ok) {
      setDateError(periodCheck.error);
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

  function pickUnderlag(file: File | undefined) {
    if (!file) return;
    const invalid = validateUnderlagMeta(file.size, file.name, file.type);
    if (invalid) {
      setAttachmentError(invalid);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setAttachment(file);
    setPreviewUrl(url);
    setPreviewMime(file.type || "application/pdf");
    setPreviewName(file.name);
    setPreviewOpen(true);
    setAttachmentError(null);
  }

  function loadNextTransaction() {
    setTransactionNote(null);
    setError(null);
    startTransactionLoad(async () => {
      const result = await nextVoucherTransaction(companyId, cursorRef.current);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const transaction = result.transaction;
      if (!transaction) {
        setTransactionNote("Inga fler obokförda transaktioner.");
        return;
      }
      const account = accounts.find((item) => item.number === transaction.bookAccountNumber);
      const amount = formatOreInput(Math.abs(transaction.amountOre));
      const incoming = transaction.amountOre > 0;
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      cursorRef.current = transaction.id;
      setBankTransactionId(transaction.id);
      setDateInput(transaction.date);
      setAnchorDate(transaction.date);
      setDateError(null);
      setText(transaction.text);
      setLines(
        withTrailingEmpty([
          {
            ...createLine(),
            accountId: account?.id ?? "",
            accountNumber: transaction.bookAccountNumber,
            accountName: account?.name ?? "",
            vatCode: account?.vatCode ?? "",
            debit: incoming ? amount : "",
            credit: incoming ? "" : amount,
          },
          ...emptyLines(7),
        ])
      );
      setAttachment(null);
      setSuggestionApplied(false);
      if (transaction.document) {
        setSuggestion({
          documentId: transaction.document.link ? transaction.document.id : null,
          postings: transaction.postings,
        });
        setPreviewUrl(`/foretag/${companyId}/underlag/fil/${transaction.document.id}`);
        setPreviewMime(transaction.document.mimeType);
        setPreviewName(transaction.document.name);
        setPreviewOpen(false);
      } else {
        setSuggestion(transaction.postings.length > 0 ? { documentId: null, postings: transaction.postings } : null);
        setPreviewUrl(null);
        setPreviewOpen(false);
      }
    });
  }

  function applySuggestion() {
    if (!suggestion) return;
    if (suggestionApplied) {
      setLines((prev) => withTrailingEmpty([prev[0] ?? createLine(), ...emptyLines(7)]));
      setSuggestionApplied(false);
      setPreviewOpen(false);
      return;
    }
    const extra = suggestion.postings.map((posting) => {
      const account = accounts.find((item) => item.number === posting.accountNumber);
      return {
        ...createLine(),
        accountId: account?.id ?? "",
        accountNumber: posting.accountNumber,
        accountName: account?.name ?? "",
        vatCode: account?.vatCode ?? "",
        debit: posting.debitOre ? formatOreInput(posting.debitOre) : "",
        credit: posting.creditOre ? formatOreInput(posting.creditOre) : "",
      };
    });
    setLines((prev) => withTrailingEmpty([prev[0] ?? createLine(), ...extra, ...emptyLines(6)]));
    setSuggestionApplied(true);
    if (previewUrl) setPreviewOpen(true);
  }

  const shortcutRef = useRef({
    showSuggestion: false,
    loading: false,
    apply: () => {},
    next: () => {},
  });
  shortcutRef.current = {
    showSuggestion: Boolean(suggestion) && !suggestionApplied,
    loading: loadingTransaction,
    apply: applySuggestion,
    next: loadNextTransaction,
  };
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "+" || event.repeat) return;
      event.preventDefault();
      const current = shortcutRef.current;
      if (current.loading) return;
      if (current.showSuggestion) current.apply();
      else current.next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!suggestionApplied) return;
    registerRef.current?.focus();
  }, [suggestionApplied]);

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
        vatCode: line.vatCode || null,
      }));

    startTransition(async () => {
      const result = await saveVoucher({
        companyId,
        date: isoDate,
        text,
        lines: payloadLines,
        attachment,
        bankTransactionId,
        documentId: suggestionApplied ? suggestion?.documentId : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNumberLabel(result.nextNumberLabel);
      setDateInput(isoDate);
      setAnchorDate(isoDate);
      setBaselineDate(isoDate);
      setText("");
      setLines(emptyLines(8));
      setError(result.attachmentError ?? null);
      setBalances((prev) => applySavedBalances(prev, payloadLines));
      setFocusedIndex(null);
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setAttachment(null);
      setPreviewUrl(null);
      setPreviewOpen(false);
      setBankTransactionId(null);
      cursorRef.current = null;
      setSuggestion(null);
      setSuggestionApplied(false);
      setAttachmentError(null);
      skipPersist.current = true;
      clearDraft(companyId);
      setCardTarget(companyId, { kind: "draft" });
      if (fileRef.current) fileRef.current.value = "";
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

  useEffect(() => {
    const draft = getWorkspace(companyId).draft;
    if (draft) {
      setDateInput(draft.dateInput);
      setAnchorDate(draft.dateInput);
      setBaselineDate(draft.defaultDate);
      setText(draft.text);
      setLines(
        draft.lines.map((line) => ({
          ...line,
          vatCode: line.vatCode ?? "",
        }))
      );
      setAttachment(draft.attachment);
      setPreviewUrl(draft.previewUrl);
      if (draft.previewUrl) setPreviewOpen(true);
    }
    setHydrated(true);
  }, [companyId]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    persistDraftIfDirty(companyId, {
      dateInput,
      defaultDate: baselineDate,
      text,
      lines,
      attachment,
      previewUrl,
    });
  }, [
    hydrated,
    companyId,
    dateInput,
    baselineDate,
    text,
    lines,
    attachment,
    previewUrl,
  ]);

  const showPreview = Boolean(previewOpen && previewUrl);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <h1 className="mb-4 text-xl font-semibold tracking-tight text-neutral-900">
          Verifikation
        </h1>

      <div className="border border-neutral-200 bg-white">
        <div className="flex items-start justify-between gap-6 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-baseline gap-3 text-sm text-neutral-700">
              <span className="w-36 shrink-0">Ver.nr</span>
              <span
                aria-label="Verifikationsnummer"
                className="tabular-nums font-medium text-neutral-900"
              >
                {numberLabel}
              </span>
            </div>
            <div>
              <label className="flex items-center gap-3 text-sm text-neutral-700">
                <span className="w-36 shrink-0">Datum</span>
                <DateTextInput
                  ref={dateRef}
                  id="voucher-date"
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
                  className={`${fieldClass} w-36 tabular-nums ${dateError ? "border-red-500" : ""}`}
                />
              </label>
              {dateError ? (
                <p role="alert" className="mt-1 ml-[9.75rem] text-xs text-red-700">
                  {dateError}
                </p>
              ) : lockedThrough ? (
                <p className="mt-1 ml-[9.75rem] text-xs text-neutral-500">
                  Låst t.o.m. {formatIsoDateSv(lockedThrough)}
                </p>
              ) : null}
            </div>
            <label className="flex items-center gap-3 text-sm text-neutral-700">
              <span className="w-36 shrink-0">Verifikationstext</span>
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
                className={`${fieldClass} w-64`}
              />
            </label>
          </div>
          <div className="flex shrink-0 flex-wrap items-start gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={UNDERLAG_ACCEPT}
              className="sr-only"
              onChange={(event) => {
                pickUnderlag(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            {suggestion ? (
              <button
                type="button"
                onClick={applySuggestion}
                title="+"
                className="h-11 rounded-md border border-sky-300 bg-sky-100 px-5 text-base font-medium text-sky-950 transition hover:bg-sky-200"
              >
                {suggestionApplied ? "Dölj förslag" : "Visa förslag"}
              </button>
            ) : null}
            <button type="button" className={headerButtonClass} disabled={loadingTransaction} title="+" onClick={loadNextTransaction}>
              {loadingTransaction ? "Hämtar…" : "Nästa transaktion"}
            </button>
            <button
              type="button"
              className={headerButtonClass}
              onClick={() => fileRef.current?.click()}
            >
              Koppla underlag
            </button>
            {previewUrl ? (
              <button
                type="button"
                className={headerButtonClass}
                onClick={() => setPreviewOpen((open) => !open)}
              >
                {previewOpen ? "Dölj underlag" : "Visa underlag"}
              </button>
            ) : null}
          </div>
        </div>

        {transactionNote ? (
          <p className="border-b border-neutral-200 px-4 py-2 text-sm text-neutral-600">{transactionNote}</p>
        ) : null}
        {attachmentError ? (
          <p role="alert" className="border-b border-neutral-200 px-4 py-2 text-sm text-red-700">
            {attachmentError}
          </p>
        ) : null}

        <div className={showPreview ? "flex min-h-[28rem]" : ""}>
          <div className={showPreview ? "shrink-0" : "min-w-0 flex-1 overflow-x-auto"}>
            <table className={`${showPreview ? "w-auto" : "w-full"} table-fixed border-collapse text-sm`}>
              <colgroup>
                <col style={{ width: "6rem" }} />
                <col style={{ width: "22rem" }} />
                <col style={{ width: "8rem" }} />
                <col style={{ width: "8rem" }} />
                {showPreview ? null : <col />}
              </colgroup>
              <thead>
                <tr className="border-b border-neutral-300 bg-neutral-100 text-left text-xs font-medium text-neutral-600">
                  <th className={`w-24 px-2 py-2 ${firstColumn} ${columnRule}`}>Konto</th>
                  <th className={`px-2 py-2 ${columnRule}`}>Benämning</th>
                  <th className={`w-32 px-2 py-2 text-right ${columnRule}`}>Debet</th>
                  <th className={`w-32 px-2 py-2 text-right ${columnRule}`}>Kredit</th>
                  {showPreview ? null : <th />}
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr
                    key={line.key}
                    className="border-b border-neutral-200"
                    onFocusCapture={() => setFocusedIndex(index)}
                  >
                    <td className={`p-0 align-top ${firstColumn} ${columnRule}`}>
                      <AccountSearch
                        companyId={companyId}
                        accounts={accounts}
                        query={line.accountNumber}
                        selectedId={line.accountId}
                        inputRef={(el) => {
                          accountRefs.current[index] = el;
                        }}
                        onFocusLine={() => setFocusedIndex(index)}
                        onQueryChange={(accountNumber) =>
                          updateLine(index, {
                            accountNumber,
                            accountId: "",
                            accountName: "",
                            vatCode: "",
                          })
                        }
                        onSelect={(account) => {
                          if (!account) {
                            updateLine(index, {
                              accountId: "",
                              accountName: "",
                              vatCode: "",
                            });
                            return;
                          }
                          applyAccount(index, account);
                        }}
                        onEmptyBlur={() => updateLine(index, { debit: "", credit: "" })}
                        onCommit={() => focusAmountAfterAccount(index)}
                        onBlankEnter={() => {
                          if (!balanced) return false;
                          registerRef.current?.focus();
                          return true;
                        }}
                      />
                    </td>
                    <td className={`p-0 align-middle ${columnRule}`}>
                      <input
                        tabIndex={-1}
                        readOnly
                        value={line.accountName}
                        title={line.accountName}
                        aria-label={`Benämning rad ${index + 1}`}
                        className={`${cellInputClass} text-neutral-600`}
                      />
                    </td>
                    <td className={`p-0 align-top ${columnRule}`}>
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
                        onBlur={(event) =>
                          updateLine(index, { debit: completeAmountDecimals(event.target.value) })
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
                    <td className={`p-0 align-top ${columnRule}`}>
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
                        onBlur={(event) =>
                          updateLine(index, { credit: completeAmountDecimals(event.target.value) })
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
                    {showPreview ? null : <td />}
                  </tr>
                ))}
                <tr className="border-t border-neutral-300 bg-neutral-50 text-sm">
                  <td colSpan={2} className={`px-2 py-2 text-neutral-600 ${firstColumn} ${columnRule}`}>
                    Summa
                  </td>
                  <td className={`px-2 py-2 text-right tabular-nums text-neutral-900 ${columnRule}`}>
                    {formatOre(totals.debit)}
                  </td>
                  <td className={`px-2 py-2 text-right tabular-nums text-neutral-900 ${columnRule}`}>
                    {formatOre(totals.credit)}
                  </td>
                  {showPreview ? null : <td />}
                </tr>
                <tr className="text-sm">
                  <td colSpan={2} className={`px-2 py-2 text-neutral-600 ${firstColumn} ${columnRule}`}>
                    Diff
                  </td>
                  <td className={columnRule} />
                  <td
                    className={`px-2 py-2 text-right tabular-nums ${columnRule} ${
                      difference === 0 ? "text-neutral-900" : "font-medium text-red-700"
                    }`}
                  >
                    {formatOre(Math.abs(difference))}
                  </td>
                  {showPreview ? null : <td />}
                </tr>
              </tbody>
            </table>
          </div>
          {showPreview ? (
            <div className="min-w-0 flex-1 overflow-hidden border-l border-neutral-200">
              <div className="border-b border-neutral-200 px-3 py-1.5 text-xs text-neutral-500">
                {previewName || attachment?.name}
              </div>
              <UnderlagPreview
                src={previewUrl}
                mimeType={attachment?.type || previewMime}
                fileName={previewName || attachment?.name || "Underlag"}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 px-4 py-3">
          <div className="space-y-1 text-sm text-neutral-700">
            <div className="flex items-baseline gap-3">
              <span className="w-14 text-neutral-600">Konto:</span>
              <span className="min-w-20 tabular-nums text-neutral-900">
                {focusedAccount?.number ?? ""}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="w-14 text-neutral-600">Saldo:</span>
              <span className="min-w-20 tabular-nums text-neutral-900">
                {focusedSaldo == null ? "" : formatOre(focusedSaldo)}
              </span>
            </div>
          </div>
          <div className="mr-36 flex items-center gap-3">
            <VatHint lines={lines} />
            <button
            ref={registerRef}
            type="button"
            disabled={!balanced || pending || Boolean(dateError)}
            onClick={submit}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Sparar…" : "Registrera"}
          </button>
          </div>
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

function VatHint({ lines }: { lines: LineDraft[] }) {
  const hint = voucherVatHint(
    lines.map((line) => ({
      accountNumber: line.accountNumber,
      accountName: line.accountName,
      vatCode: line.vatCode || null,
      debitOre: parseAmountToOre(line.debit) ?? 0,
      creditOre: parseAmountToOre(line.credit) ?? 0,
    }))
  );
  if (!hint) return null;
  const ok = hint === "ok";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${
        ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
      }`}
    >
      {ok ? "Moms ok" : "Moms fel"}
    </span>
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

function applySavedBalances(
  prev: Record<string, number>,
  lines: { accountId: string; debitOre: number; creditOre: number }[]
): Record<string, number> {
  const next = { ...prev };
  for (const line of lines) {
    next[line.accountId] = (next[line.accountId] ?? 0) + line.debitOre - line.creditOre;
  }
  return next;
}
