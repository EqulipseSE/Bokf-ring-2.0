"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { formatOre } from "@/lib/money";
import { UNDERLAG_ACCEPT, validateUnderlagMeta } from "@/lib/underlag";
import type { VoucherDetail } from "@/lib/vouchers";
import { attachVoucherUnderlag } from "./actions";
import { UnderlagPreview } from "./underlag-preview";

const headerButtonClass =
  "h-8 border border-neutral-300 bg-white px-3 text-sm text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40";

type SavedVoucherProps = {
  companyId: string;
  voucher: VoucherDetail;
  accountBalances: Record<string, number>;
};

export function SavedVoucher({
  companyId,
  voucher,
  accountBalances,
}: SavedVoucherProps) {
  const listHref = `/foretag/${companyId}/verifikationer`;
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [focusedAccountId, setFocusedAccountId] = useState<string | null>(
    voucher.lines[0]?.accountId ?? null
  );
  const [attachment, setAttachment] = useState(voucher.attachment);
  const [previewOpen, setPreviewOpen] = useState(Boolean(voucher.attachment));

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
          Sparad av {voucher.registeredByName} · kan inte ändras
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
              <span className="tabular-nums text-neutral-900">{voucher.date}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="w-36 shrink-0">Verifikationstext</span>
              <span className="text-neutral-900">{voucher.text}</span>
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
              disabled={pending}
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
          </div>
        </div>

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
                </tr>
              </thead>
              <tbody>
                {voucher.lines.map((line) => {
                  const active = line.accountId === focusedAccountId;
                  return (
                    <tr
                      key={line.lineNumber}
                      tabIndex={0}
                      onClick={() => setFocusedAccountId(line.accountId)}
                      onFocus={() => setFocusedAccountId(line.accountId)}
                      className={`cursor-pointer border-b border-neutral-100 ${
                        active ? "bg-neutral-50" : ""
                      }`}
                    >
                      <td className="px-2 py-2 font-mono tabular-nums text-neutral-900">
                        {line.accountNumber}
                      </td>
                      <td className="px-2 py-2 text-neutral-700">{line.accountName}</td>
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
                  <td colSpan={2} className="px-2 py-2 text-neutral-600">
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

        <div className="border-t border-neutral-200 px-4 py-3">
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
        </div>
      </div>
    </div>
  );
}
