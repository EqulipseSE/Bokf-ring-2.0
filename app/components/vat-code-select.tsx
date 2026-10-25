"use client";

import { VAT_CODES } from "@/lib/vat-codes";

export function VatCodeSelect({
  value,
  onChange,
  ariaLabel,
  compact = false,
  tabIndex,
}: {
  value: string;
  onChange: (code: string) => void;
  ariaLabel: string;
  compact?: boolean;
  tabIndex?: number;
}) {
  return (
    <select
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      value={value}
      title={VAT_CODES.find((item) => item.code === value)?.name ?? "Ingen momskod"}
      onChange={(event) => onChange(event.target.value)}
      className={
        compact
          ? "h-8 w-full bg-transparent px-1.5 text-xs text-neutral-800 outline-none focus:bg-white focus:ring-1 focus:ring-neutral-400"
          : "w-full rounded-md border border-neutral-300 bg-white px-1.5 py-1 text-xs text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200"
      }
    >
      <option value="">—</option>
      {VAT_CODES.map((item) => (
        <option key={item.code} value={item.code}>
          {compact ? item.code : `${item.code} · ${item.name}`}
        </option>
      ))}
    </select>
  );
}
