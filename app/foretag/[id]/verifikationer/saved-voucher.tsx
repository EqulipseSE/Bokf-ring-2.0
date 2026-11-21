"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { DateTextInput } from "@/app/components/date-text-input";
import { completeAmountDecimals, formatOre, formatOreInput, parseAmountToOre } from "@/lib/money";
import { parseVoucherDate } from "@/lib/voucher-date";
import { voucherVatHint } from "@/lib/vat-check";
import { UNDERLAG_ACCEPT, validateUnderlagMeta } from "@/lib/underlag";
import type { VoucherDetail, VoucherEdit } from "@/lib/vouchers";
import { attachVoucherUnderlag, updateVoucher } from "./actions";
import { UnderlagPreview } from "./underlag-preview";
import { setCardTarget } from "./voucher-draft";

const headerButtonClass =
  "h-8 border border-neutral-300 bg-white px-3 text-sm text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40";

type SavedVoucherProps = {
  companyId: string;
  voucher: VoucherDetail;
  accountBalances: Record<string, number>;
  edits: VoucherEdit[];
  periodLocked: boolean;
  lockMessage: string | null;
};

export function SavedVoucher({
  companyId,
  voucher,
  accountBalances,
  edits,
  periodLocked,
  lockMessage,
}: SavedVoucherProps) {
  const router = useRouter();
  const listHref = `/foretag/${companyId}/verifikationer`;
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(voucher.date);
  const [text, setText] = useState(voucher.text);
  const [lines, setLines] = useState(() => linesFromVoucher(voucher));
  const [showEdits, setShowEdits] = useState(false);
  const [focusedAccountId, setFocusedAccountId] = useState<string | null>(
    voucher.lines[0]?.accountId ?? null
  );
  const [attachment, setAttachment] = useState(voucher.attachment);
  const [previewOpen, setPreviewOpen] = useState(Boolean(voucher.attachment));

  useEffect(() => {
    setCardTarget(companyId, { kind: "saved", id: voucher.id });
    setDate(voucher.date);
    setText(voucher.text);
    setLines(linesFromVoucher(voucher));
  }, [companyId, voucher]);

  const debitOre = lines.reduce((sum, line) => sum + (parseAmountToOre(line.debit) ?? 0), 0);
  const creditOre = lines.reduce((sum, line) => sum + (parseAmountToOre(line.credit) ?? 0), 0);
  const canSave =
    !periodLocked &&
    (lines.length === 0 ||
      (debitOre === creditOre &&
        debitOre > 0 &&
        lines.every(
          (line) =>
            line.accountId &&
            ((parseAmountToOre(line.debit) ?? 0) > 0) !== ((parseAmountToOre(line.credit) ?? 0) > 0)
        )));

  function saveEdit() {
    if (!canSave) return;
    setError(null);
    startTransition(async () => {
      const result = await updateVoucher(companyId, voucher.id, {
        date,
        text,
        lines: lines.map((line) => ({
          accountId: line.accountId,
          debitOre: parseAmountToOre(line.debit) ?? 0,
          creditOre: parseAmountToOre(line.credit) ?? 0,
          vatCode: line.vatCode || null,
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowEdits(true);
      router.refresh();
    });
  }

  const previewSrc = attachment
    ? `/foretag/${companyId}/verifikationer/${voucher.id}/underlag`
    : null;
  const focusedLine = voucher.lines.find((line) => line.accountId === focusedAccountId);
  const focusedSaldo = focusedAccountId
    ? (accountBalances[focusedAccountId] ?? 0)
    : null;

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

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
      <Link
        href={listHref}
        className="text-sm text-neutral-500 transition hover:text-neutral-900"
      >
        ← Tillbaka till verifikationer
      </Link>

      <div className="mt-3 mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-neutral-900">
          Verifikation
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sparad av {voucher.registeredByName}. Alla rader kan tas bort. Finns rader kvar måste verifikationen gå jämnt ut.
        </p>
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
            <div className="flex items-baseline gap-3">
              <span className="w-36 shrink-0">Datum</span>
              <DateTextInput
                aria-label="Datum"
                value={date}
                disabled={periodLocked}
                onChange={(event) => setDate(event.target.value)}
                onBlur={() => {
                  const parsed = parseVoucherDate(date, date);
                  if (parsed.ok) setDate(parsed.iso);
                }}
                className="h-8 w-36 border border-neutral-300 px-2 text-sm tabular-nums"
              />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="w-36 shrink-0">Verifikationstext</span>
              <input
                aria-label="Verifikationstext"
                value={text}
                disabled={periodLocked}
                onChange={(event) => setText(event.target.value)}
                className="h-8 min-w-0 flex-1 border border-neutral-300 px-2 text-sm"
              />
            </div>
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
            <button
              type="button"
              className={headerButtonClass}
              disabled={pending || periodLocked}
              onClick={() => fileRef.current?.click()}
            >
              {pending ? "Sparar underlag…" : "Koppla underlag"}
            </button>
            <button
              type="button"
              className={headerButtonClass}
              disabled={!attachment}
              onClick={() => setPreviewOpen((open) => !open)}
            >
              {previewOpen && attachment ? "Dölj underlag" : "Visa underlag"}
            </button>
            <button
              type="button"
              className={headerButtonClass}
              onClick={() => setShowEdits((open) => !open)}
            >
              {showEdits ? "Dölj redigeringar" : "Visa redigeringar"}
            </button>
          </div>
        </div>

        {periodLocked && lockMessage ? (
          <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">
            {lockMessage} Underlag kan inte läggas till.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="border-b border-neutral-200 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className={previewOpen && previewSrc ? "flex min-h-[28rem]" : ""}>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-100 text-left text-xs font-medium text-neutral-600">
                  <th className="w-24 px-2 py-2">Konto</th>
                  <th className="px-2 py-2">Benämning</th>
                  <th className="w-32 px-2 py-2 text-right">Debet</th>
                  <th className="w-32 px-2 py-2 text-right">Kredit</th>
                  <th className="w-20 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const active = line.accountId === focusedAccountId;
                  return (
                    <tr
                      key={line.key}
                      onClick={() => setFocusedAccountId(line.accountId)}
                      className={`border-b border-neutral-100 ${active ? "bg-neutral-50" : ""}`}
                    >
                      <td className="px-2 py-2 font-mono tabular-nums text-neutral-900">
                        {line.accountNumber}
                      </td>
                      <td className="px-2 py-2 text-neutral-700">{line.accountName}</td>
                      <td className="p-0">
                        <input
                          aria-label={`Debet ${line.accountNumber}`}
                          inputMode="decimal"
                          disabled={periodLocked}
                          value={line.debit}
                          onChange={(event) =>
                            setLines((prev) =>
                              prev.map((row) =>
                                row.key === line.key
                                  ? { ...row, debit: event.target.value, credit: "" }
                                  : row
                              )
                            )
                          }
                          onBlur={(event) => {
                            const debit = completeAmountDecimals(event.target.value);
                            setLines((prev) =>
                              prev.map((row) => (row.key === line.key ? { ...row, debit } : row))
                            );
                          }}
                          className="h-8 w-full bg-transparent px-2 text-right text-sm tabular-nums outline-none"
                        />
                      </td>
                      <td className="p-0">
                        <input
                          aria-label={`Kredit ${line.accountNumber}`}
                          inputMode="decimal"
                          disabled={periodLocked}
                          value={line.credit}
                          onChange={(event) =>
                            setLines((prev) =>
                              prev.map((row) =>
                                row.key === line.key
                                  ? { ...row, credit: event.target.value, debit: "" }
                                  : row
                              )
                            )
                          }
                          onBlur={(event) => {
                            const credit = completeAmountDecimals(event.target.value);
                            setLines((prev) =>
                              prev.map((row) => (row.key === line.key ? { ...row, credit } : row))
                            );
                          }}
                          className="h-8 w-full bg-transparent px-2 text-right text-sm tabular-nums outline-none"
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <button
                          type="button"
                          disabled={periodLocked}
                          onClick={() =>
                            setLines((prev) => prev.filter((row) => row.key !== line.key))
                          }
                          className="text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-40"
                        >
                          Ta bort
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t border-neutral-200 bg-neutral-50 text-sm">
                  <td colSpan={2} className="px-2 py-2 text-neutral-600">
                    Summa
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-neutral-900">
                    {formatOre(debitOre)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-neutral-900">
                    {formatOre(creditOre)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
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
                {focusedLine?.accountNumber ?? ""}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="w-14 text-neutral-600">Saldo:</span>
              <span className="min-w-20 tabular-nums text-neutral-900">
                {focusedSaldo == null ? "" : formatOre(focusedSaldo)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SavedVatHint lines={lines} />
            <button
            type="button"
            disabled={!canSave || pending}
            onClick={saveEdit}
            className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {pending ? "Sparar…" : "Spara"}
          </button>
          </div>
        </div>
        {showEdits ? (
          <div className="border-t border-neutral-200 px-4 py-3">
            {edits.length === 0 ? (
              <p className="text-sm text-neutral-500">Inga redigeringar ännu.</p>
            ) : (
              <div className="space-y-4">
                {edits.map((edit) => (
                  <div key={edit.id} className="text-sm">
                    <p className="text-neutral-600">
                      {new Date(edit.editedAt).toLocaleString("sv-SE")} · {edit.editedByName} · tidigare{" "}
                      {edit.previousDate} · {edit.previousText}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {edit.lines.map((line) => (
                        <li key={line.lineNumber} className="tabular-nums text-neutral-800">
                          {line.accountNumber} {line.accountName}{" "}
                          {line.debit > 0 ? `debet ${formatOre(line.debit)}` : `kredit ${formatOre(line.credit)}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SavedVatHint({
  lines,
}: {
  lines: { accountNumber: string; accountName: string; vatCode: string; debit: string; credit: string }[];
}) {
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

function linesFromVoucher(voucher: VoucherDetail) {
  return voucher.lines.map((line) => ({
    key: `${line.lineNumber}-${line.accountId}`,
    accountId: line.accountId,
    accountNumber: line.accountNumber,
    accountName: line.accountName,
    vatCode: line.vatCode ?? "",
    debit: line.debit > 0 ? formatOreInput(line.debit) : "",
    credit: line.credit > 0 ? formatOreInput(line.credit) : "",
  }));
}
