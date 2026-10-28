"use client";

import { useState, type ReactNode } from "react";
import type { TimeReportRow } from "@/lib/time-reports";

export function TimeReportTable({ rows }: { rows: TimeReportRow[] }) {
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  function toggle(key: string) {
    setOpenKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-5 py-3.5 font-medium">Företag</th>
            <th className="px-5 py-3.5 font-medium">Månad</th>
            <th className="px-5 py-3.5 font-medium">Person</th>
            <th className="px-5 py-3.5 text-right font-medium">Timmar</th>
          </tr>
        </thead>
        {rows.map((row) => {
          const key = `${row.companyId}-${row.yearMonth}-${row.userId}`;
          const open = openKeys.includes(key);
          return (
            <tbody key={key} className="border-t border-neutral-100">
              <tr className={open ? "bg-neutral-50" : undefined}>
                <td className="p-0">
                  <RowButton open={open} onClick={() => toggle(key)} labelled>
                    <span className="flex items-center gap-2 font-medium text-neutral-900">
                      <Chevron open={open} />
                      {row.companyName}
                    </span>
                  </RowButton>
                </td>
                <td className="p-0">
                  <RowButton onClick={() => toggle(key)} tabIndex={-1}>
                    <span className="text-neutral-700">{row.monthLabel}</span>
                  </RowButton>
                </td>
                <td className="p-0">
                  <RowButton onClick={() => toggle(key)} tabIndex={-1}>
                    <span className="font-medium tracking-wide text-neutral-800">
                      {row.initials}
                    </span>
                  </RowButton>
                </td>
                <td className="p-0">
                  <RowButton
                    onClick={() => toggle(key)}
                    tabIndex={-1}
                    align="right"
                  >
                    <span className="tabular-nums text-neutral-900">
                      {row.hoursLabel}
                    </span>
                  </RowButton>
                </td>
              </tr>
              {open ? (
                <tr>
                  <td colSpan={4} className="bg-neutral-50 px-5 pb-4 pt-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wide text-neutral-500">
                          <th className="py-2 pr-4 font-medium">Datum</th>
                          <th className="py-2 pr-4 font-medium">Klockslag</th>
                          <th className="py-2 pr-4 font-medium">Beskrivning</th>
                          <th className="py-2 text-right font-medium">Timmar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {row.entries.map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-t border-neutral-200/80"
                          >
                            <td className="py-2 pr-4 tabular-nums text-neutral-700">
                              {entry.dateLabel}
                            </td>
                            <td className="py-2 pr-4 tabular-nums text-neutral-700">
                              {entry.timeLabel}
                            </td>
                            <td className="py-2 pr-4 text-neutral-800">
                              {entry.summary}
                            </td>
                            <td className="py-2 text-right tabular-nums text-neutral-900">
                              {entry.hoursLabel}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ) : null}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

function RowButton({
  open = false,
  onClick,
  children,
  tabIndex,
  align = "left",
  labelled = false,
}: {
  open?: boolean;
  onClick: () => void;
  children: ReactNode;
  tabIndex?: number;
  align?: "left" | "right";
  labelled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-expanded={labelled ? open : undefined}
      tabIndex={tabIndex}
      onClick={onClick}
      className={`w-full px-5 py-4 transition hover:bg-neutral-50 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className={`h-3 w-3 shrink-0 text-neutral-400 transition ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 2.5 8 6 4.5 9.5" />
    </svg>
  );
}
