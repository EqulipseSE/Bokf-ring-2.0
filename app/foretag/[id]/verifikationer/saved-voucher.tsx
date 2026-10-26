"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MutableRefObject,
} from "react";
import { VatCodeSelect } from "@/app/components/vat-code-select";
import type { Account } from "@/lib/db/schema";
import { formatOre, formatOreInput, parseAmountToOre } from "@/lib/money";
import { assertDateOpen, formatIsoDateSv } from "@/lib/period-lock";
import { UNDERLAG_ACCEPT, validateUnderlagMeta } from "@/lib/underlag";
import { vatCodeName } from "@/lib/vat-codes";
import { parseVoucherDate } from "@/lib/voucher-date";
import type { VoucherChangeView, VoucherDetail } from "@/lib/vouchers";
import { AccountSearch } from "./account-search";
import { attachVoucherUnderlag, updateVoucher } from "./actions";
import { UnderlagPreview } from "./underlag-preview";
import { setCardTarget } from "./voucher-draft";
import { VoucherHistoryDialog } from "./voucher-history";

const headerButtonClass =
  "h-8 border border-neutral-300 bg-white px-3 text-sm text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40";
const fieldClass =
  "h-8 border border-neutral-300 bg-white px-2 text-sm text-neutral-900 outline-none focus:ring-1 focus:ring-neutral-400";
const cellInputClass =
  "h-8 w-full bg-transparent px-2 py-1 text-sm text-neutral-900 outline-none focus:bg-white focus:ring-1 focus:ring-neutral-400";

type LineDraft = {
  key: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  vatCode: string;
  debit: string;
  credit: string;
};

type SavedVoucherProps = {
  companyId: string;
  voucher: VoucherDetail;
  accounts: Account[];
  accountBalances: Record<string, number>;
  periodLocked: boolean;
  lockMessage: string | null;
  lockedThrough: string | null;
  changes: VoucherChangeView[];
};

export function SavedVoucher({
  companyId,
  voucher,
  accounts,
  accountBalances,
  periodLocked,
  lockMessage,
  lockedThrough,
  changes,
}: SavedVoucherProps) {
  const router = useRouter();
  const listHref = `/foretag/${companyId}/verifikationer`;
  const fileRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const accountRefs = useRef<Array<HTMLInputElement | null>>([]);
  const debitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const creditRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [focusedAccountId, setFocusedAccountId] = useState<string | null>(
    voucher.lines[0]?.accountId ?? null
  );
  const [attachment, setAttachment] = useState(voucher.attachment);
  const [previewOpen, setPreviewOpen] = useState(Boolean(voucher.attachment));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dateInput, setDateInput] = useState(voucher.date);
  const [dateError, setDateError] = useState<string | null>(null);
  const [text, setText] = useState(voucher.text);
  const [lines, setLines] = useState<LineDraft[]>(() => linesFromVoucher(voucher));
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  useEffect(() => {
    setCardTarget(companyId, { kind: "saved", id: voucher.id });
  }, [companyId, voucher.id]);

  useEffect(() => {
    setAttachment(voucher.attachment);
    setDateInput(voucher.date);
    setText(voucher.text);
    setLines(linesFromVoucher(voucher));
    setDateError(null);
    setFocusedAccountId(voucher.lines[0]?.accountId ?? null);
  }, [voucher]);

  const previewSrc = attachment
    ? `/foretag/${companyId}/verifikationer/${voucher.id}/underlag`
    : null;
  const totals = sumLines(lines);
  const difference = totals.debit - totals.credit;
  const readyLines = lines.filter((line) => !isLineEmpty(line));
  const balanced =
    difference === 0 &&
    totals.debit > 0 &&
    readyLines.length >= 2 &&
    readyLines.every((line) => line.accountId);
  const dirty = isDirty(voucher, dateInput, text, readyLines);
  const liveBalances = useMemo(
    () => balancesWithDraft(accountBalances, voucher.lines, readyLines),
    [accountBalances, voucher.lines, readyLines]
  );
  const focusedLine = editing
    ? focusedIndex != null
      ? lines[focusedIndex]
      : null
    : voucher.lines.find((line) => line.accountId === focusedAccountId);
  const focusedAccountIdNow = editing
    ? focusedLine && "accountId" in focusedLine
      ? focusedLine.accountId
      : null
    : focusedAccountId;
  const focusedSaldo = focusedAccountIdNow
    ? editing
      ? (liveBalances[focusedAccountIdNow] ?? 0)
      : (accountBalances[focusedAccountIdNow] ?? 0)
    : null;
  const focusedAccountNumber = editing
    ? (focusedLine as LineDraft | null)?.accountNumber
    : voucher.lines.find((line) => line.accountId === focusedAccountId)?.accountNumber;

  function startEdit() {
    if (periodLocked) return;
    setEditing(true);
    setError(null);
    setSavedNote(null);
    setDateInput(voucher.date);
    setText(voucher.text);
    setLines(linesFromVoucher(voucher));
    setDateError(null);
    window.requestAnimationFrame(() => textRef.current?.focus());
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
    setDateInput(voucher.date);
    setText(voucher.text);
    setLines(linesFromVoucher(voucher));
    setDateError(null);
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) =>
      withTrailingEmpty(prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
    );
  }

  function applyAccount(index: number, account: Account | null) {
    setLines((prev) => {
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

  function resolvedDate(): string | null {
    const parsed = parseVoucherDate(dateInput, voucher.date);
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
    setDateError(null);
    return parsed.iso;
  }

  function submitEdit() {
    if (pending || periodLocked) return;
    const isoDate = resolvedDate();
    if (!isoDate) return;
    if (!balanced || !dirty) return;
    setError(null);
    const payloadLines = readyLines.map((line) => ({
      accountId: line.accountId,
      debitOre: parseAmountToOre(line.debit) ?? 0,
      creditOre: parseAmountToOre(line.credit) ?? 0,
      vatCode: line.vatCode || null,
    }));
    startTransition(async () => {
      const result = await updateVoucher({
        companyId,
        voucherId: voucher.id,
        date: isoDate,
        text,
        lines: payloadLines,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedNote("Ändringar sparade");
      setEditing(false);
      router.refresh();
    });
  }

  function pickUnderlag(file: File | undefined) {
    if (!file) return;
    const invalid = validateUnderlagMeta(file.size, file.name, file.type);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await attachVoucherUnderlag(companyId, voucher.id, file);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAttachment({
        originalName: result.fileName,
        mimeType: file.type || "application/octet-stream",
      });
      setPreviewOpen(true);
    });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!editing) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        submitEdit();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        cancelEdit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <Link
        href={listHref}
        className="text-sm text-neutral-500 transition hover:text-neutral-900"
      >
        ← Tillbaka till verifikationer
      </Link>

      <div className="mt-3 mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
            Verifikation
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sparad av {voucher.registeredByName}
            {periodLocked
              ? " · perioden är låst, kan inte ändras"
              : " · kan ändras tills perioden låses"}
          </p>
        </div>
        {savedNote ? (
          <p role="status" className="text-sm font-medium text-emerald-800">
            {savedNote}
          </p>
        ) : null}
      </div>

      <div className="border border-neutral-200 bg-white">
        <div className="flex items-start justify-between gap-6 border-b border-neutral-200 px-4 py-3">
          <div className="min-w-0 flex-1 space-y-2 text-sm text-neutral-700">
            <div className="flex items-baseline gap-3">
              <span className="w-36 shrink-0">Ver.nr</span>
              <span className="tabular-nums font-medium text-neutral-900">
                {voucher.numberLabel}
              </span>
            </div>
            {editing ? (
              <>
                <div>
                  <label className="flex items-center gap-3">
                    <span className="w-36 shrink-0">Datum</span>
                    <input
                      ref={dateRef}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={dateInput}
                      onChange={(event) => {
                        setDateInput(event.target.value);
                        setDateError(null);
                      }}
                      onBlur={() => resolvedDate()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          if (resolvedDate()) textRef.current?.focus();
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
                <label className="flex items-center gap-3">
                  <span className="w-36 shrink-0">Verifikationstext</span>
                  <input
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
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="w-36 shrink-0">Datum</span>
                  <span className="tabular-nums text-neutral-900">{voucher.date}</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="w-36 shrink-0">Verifikationstext</span>
                  <span className="text-neutral-900">{voucher.text}</span>
                </div>
              </>
            )}
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
            {!periodLocked && !editing ? (
              <button type="button" className={headerButtonClass} onClick={startEdit}>
                Ändra
              </button>
            ) : null}
            {editing ? (
              <button type="button" className={headerButtonClass} onClick={cancelEdit}>
                Avbryt
              </button>
            ) : null}
            <button
              type="button"
              className={headerButtonClass}
              onClick={() => setHistoryOpen(true)}
            >
              Visa ändringar
            </button>
            <button
              type="button"
              className={headerButtonClass}
              disabled={pending || periodLocked || editing}
              onClick={() => fileRef.current?.click()}
            >
              {pending && !editing ? "Sparar underlag…" : "Koppla underlag"}
            </button>
            <button
              type="button"
              className={headerButtonClass}
              disabled={!attachment}
              onClick={() => setPreviewOpen((open) => !open)}
            >
              {previewOpen && attachment ? "Dölj underlag" : "Visa underlag"}
            </button>
          </div>
        </div>

        {periodLocked && lockMessage ? (
          <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">
            {lockMessage} Verifikationen kan inte ändras.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="border-b border-neutral-200 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className={previewOpen && previewSrc ? "flex min-h-[28rem]" : ""}>
          <div className="min-w-0 flex-1 overflow-x-auto">
            {editing ? (
              <EditLinesTable
                lines={lines}
                accounts={accounts}
                totals={totals}
                difference={difference}
                accountRefs={accountRefs}
                debitRefs={debitRefs}
                creditRefs={creditRefs}
                onFocusIndex={setFocusedIndex}
                onUpdateLine={updateLine}
                onApplyAccount={applyAccount}
              />
            ) : (
              <ViewLinesTable
                voucher={voucher}
                focusedAccountId={focusedAccountId}
                onFocus={setFocusedAccountId}
              />
            )}
          </div>
          {previewOpen && previewSrc && attachment ? (
            <div className="w-[44%] min-w-[18rem] border-l border-neutral-200">
              <div className="border-b border-neutral-200 px-3 py-1.5 text-xs text-neutral-500">
                {attachment.originalName}
              </div>
              <UnderlagPreview
                src={previewSrc}
                mimeType={attachment.mimeType}
                fileName={attachment.originalName}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-neutral-200 px-4 py-3">
          <div className="space-y-1 text-sm text-neutral-700">
            <div className="flex items-baseline gap-3">
              <span className="w-14 text-neutral-600">Konto:</span>
              <span className="min-w-20 tabular-nums text-neutral-900">
                {focusedAccountNumber ?? ""}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="w-14 text-neutral-600">Saldo:</span>
              <span className="min-w-20 tabular-nums text-neutral-900">
                {focusedSaldo == null ? "" : formatOre(focusedSaldo)}
              </span>
            </div>
          </div>
          {editing ? (
            <button
              type="button"
              disabled={!balanced || !dirty || pending || Boolean(dateError)}
              onClick={submitEdit}
              className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Sparar…" : "Spara ändringar"}
            </button>
          ) : null}
        </div>
      </div>

      <VoucherHistoryDialog
        open={historyOpen}
        changes={changes}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
}

function ViewLinesTable({
  voucher,
  focusedAccountId,
  onFocus,
}: {
  voucher: VoucherDetail;
  focusedAccountId: string | null;
  onFocus: (accountId: string) => void;
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-neutral-200 bg-neutral-100 text-left text-xs font-medium text-neutral-600">
          <th className="w-24 px-2 py-2">Konto</th>
          <th className="px-2 py-2">Benämning</th>
          <th className="w-20 px-2 py-2">Momskod</th>
          <th className="w-32 px-2 py-2 text-right">Debet</th>
          <th className="w-32 px-2 py-2 text-right">Kredit</th>
        </tr>
      </thead>
      <tbody>
        {voucher.lines.map((line) => {
          const active = line.accountId === focusedAccountId;
          return (
            <tr
              key={line.lineNumber}
              tabIndex={0}
              onClick={() => onFocus(line.accountId)}
              onFocus={() => onFocus(line.accountId)}
              className={`cursor-pointer border-b border-neutral-100 ${
                active ? "bg-neutral-50" : ""
              }`}
            >
              <td className="px-2 py-2 font-mono tabular-nums text-neutral-900">
                {line.accountNumber}
              </td>
              <td className="px-2 py-2 text-neutral-700">{line.accountName}</td>
              <td
                className="px-2 py-2 font-mono text-neutral-700"
                title={vatCodeName(line.vatCode)}
              >
                {line.vatCode ?? ""}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-neutral-900">
                {line.debit > 0 ? formatOre(line.debit) : ""}
              </td>
              <td className="px-2 py-2 text-right tabular-nums text-neutral-900">
                {line.credit > 0 ? formatOre(line.credit) : ""}
              </td>
            </tr>
          );
        })}
        <tr className="border-t border-neutral-200 bg-neutral-50 text-sm">
          <td colSpan={3} className="px-2 py-2 text-neutral-600">
            Summa
          </td>
          <td className="px-2 py-2 text-right tabular-nums text-neutral-900">
            {formatOre(voucher.debitOre)}
          </td>
          <td className="px-2 py-2 text-right tabular-nums text-neutral-900">
            {formatOre(voucher.creditOre)}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function EditLinesTable({
  lines,
  accounts,
  totals,
  difference,
  accountRefs,
  debitRefs,
  creditRefs,
  onFocusIndex,
  onUpdateLine,
  onApplyAccount,
}: {
  lines: LineDraft[];
  accounts: Account[];
  totals: { debit: number; credit: number };
  difference: number;
  accountRefs: MutableRefObject<Array<HTMLInputElement | null>>;
  debitRefs: MutableRefObject<Array<HTMLInputElement | null>>;
  creditRefs: MutableRefObject<Array<HTMLInputElement | null>>;
  onFocusIndex: (index: number) => void;
  onUpdateLine: (index: number, patch: Partial<LineDraft>) => void;
  onApplyAccount: (index: number, account: Account | null) => void;
}) {
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

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-neutral-200 bg-neutral-100 text-left text-xs font-medium text-neutral-600">
          <th className="w-24 px-2 py-2">Konto</th>
          <th className="px-2 py-2">Benämning</th>
          <th className="w-20 px-2 py-2">Momskod</th>
          <th className="w-32 px-2 py-2 text-right">Debet</th>
          <th className="w-32 px-2 py-2 text-right">Kredit</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) => (
          <tr
            key={line.key}
            className="border-b border-neutral-100"
            onFocusCapture={() => onFocusIndex(index)}
          >
            <td className="p-0 align-top">
              <AccountSearch
                accounts={accounts}
                query={line.accountNumber}
                selectedId={line.accountId}
                inputRef={(el) => {
                  accountRefs.current[index] = el;
                }}
                onFocusLine={() => onFocusIndex(index)}
                onQueryChange={(accountNumber) =>
                  onUpdateLine(index, {
                    accountNumber,
                    accountId: "",
                    accountName: "",
                    vatCode: "",
                  })
                }
                onSelect={(account) => {
                  if (!account) {
                    onUpdateLine(index, {
                      accountId: "",
                      accountName: "",
                      vatCode: "",
                    });
                    return;
                  }
                  onApplyAccount(index, account);
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
            <td className="p-0 align-middle">
              <VatCodeSelect
                compact
                tabIndex={-1}
                value={line.vatCode}
                ariaLabel={`Momskod rad ${index + 1}`}
                onChange={(vatCode) => onUpdateLine(index, { vatCode })}
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
                  onUpdateLine(index, { debit: event.target.value, credit: "" })
                }
                onFocus={(event) => {
                  if (!line.debit && !line.credit) {
                    const suggestion = remainderSuggestion(lines, index);
                    if (suggestion.debit) {
                      onUpdateLine(index, { debit: suggestion.debit, credit: "" });
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
                  onUpdateLine(index, { credit: event.target.value, debit: "" })
                }
                onFocus={(event) => {
                  if (!line.debit && !line.credit) {
                    const suggestion = remainderSuggestion(lines, index);
                    if (suggestion.credit) {
                      onUpdateLine(index, { debit: "", credit: suggestion.credit });
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
          <td colSpan={3} className="px-2 py-2 text-neutral-600">
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
          <td colSpan={3} className="px-2 py-2 text-neutral-600">
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
  );
}

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

function linesFromVoucher(voucher: VoucherDetail): LineDraft[] {
  const lines = voucher.lines.map((line) => ({
    key: `${line.lineNumber}-${line.accountId}`,
    accountId: line.accountId,
    accountNumber: line.accountNumber,
    accountName: line.accountName,
    vatCode: line.vatCode ?? "",
    debit: line.debit > 0 ? formatOreInput(line.debit) : "",
    credit: line.credit > 0 ? formatOreInput(line.credit) : "",
  }));
  return withTrailingEmpty(lines.length ? lines : [createLine()]);
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

function isDirty(
  voucher: VoucherDetail,
  dateInput: string,
  text: string,
  readyLines: LineDraft[]
): boolean {
  if (dateInput.trim() !== voucher.date) return true;
  if (text.trim() !== voucher.text) return true;
  if (readyLines.length !== voucher.lines.length) return true;
  return readyLines.some((line, index) => {
    const original = voucher.lines[index];
    if (!original) return true;
    return (
      line.accountId !== original.accountId ||
      (line.vatCode || null) !== (original.vatCode || null) ||
      (parseAmountToOre(line.debit) ?? 0) !== original.debit ||
      (parseAmountToOre(line.credit) ?? 0) !== original.credit
    );
  });
}

function balancesWithDraft(
  base: Record<string, number>,
  original: VoucherDetail["lines"],
  draft: LineDraft[]
): Record<string, number> {
  const next = { ...base };
  for (const line of original) {
    next[line.accountId] = (next[line.accountId] ?? 0) - line.debit + line.credit;
  }
  for (const line of draft) {
    if (!line.accountId) continue;
    const debit = parseAmountToOre(line.debit) ?? 0;
    const credit = parseAmountToOre(line.credit) ?? 0;
    next[line.accountId] = (next[line.accountId] ?? 0) + debit - credit;
  }
  return next;
}
