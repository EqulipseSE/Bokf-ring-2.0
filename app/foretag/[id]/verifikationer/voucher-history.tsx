"use client";

import type { VoucherChangeView } from "@/lib/vouchers";

export function VoucherHistoryDialog({
  open,
  changes,
  onClose,
}: {
  open: boolean;
  changes: VoucherChangeView[];
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-24"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="voucher-changes-title"
        className="max-h-[70vh] w-full max-w-2xl overflow-y-auto border border-neutral-200 bg-white shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <h2
            id="voucher-changes-title"
            className="text-base font-semibold text-neutral-900"
          >
            Ändringar
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 border border-neutral-300 bg-white px-3 text-sm text-neutral-800 transition hover:bg-neutral-50"
          >
            Stäng
          </button>
        </div>

        {changes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-neutral-600">
            Inga ändringar har gjorts på den här verifikationen.
          </p>
        ) : (
          <ol className="divide-y divide-neutral-100">
            {changes.map((change) => (
              <li key={change.id} className="px-4 py-3">
                <p className="text-sm text-neutral-900">
                  <time dateTime={change.changedAtIso}>
                    {change.changedAtLabel}
                  </time>
                  {" · "}
                  {change.changedByName}
                </p>
                <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                  {change.items.map((item, index) => (
                    <li key={`${change.id}-${index}`}>
                      <span className="font-medium text-neutral-900">
                        {item.label}:
                      </span>{" "}
                      {item.from && item.to ? (
                        <>
                          {item.from}
                          {" → "}
                          {item.to}
                        </>
                      ) : item.to ? (
                        item.to
                      ) : (
                        item.from
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
