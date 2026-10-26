"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  formatIsoDateSv,
  formatMonthYear,
  lockThroughMonth,
  type NextLockTarget,
  type PeriodLockPageData,
} from "@/lib/period-lock";
import { companyHref } from "../menu";
import { lockPeriod } from "./actions";

const fieldClass =
  "h-9 rounded-md border border-neutral-300 bg-white px-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200";

export function PeriodLockView({
  companyId,
  companyName,
  orgNumber,
  view,
}: {
  companyId: string;
  companyName: string;
  orgNumber: string;
  view: PeriodLockPageData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<"month" | "date">("month");
  const defaultMonth = view.lockable[0]?.month ?? view.next.month;
  const [month, setMonth] = useState(defaultMonth);
  const [date, setDate] = useState(view.next.through);

  useEffect(() => {
    setMonth(view.lockable[0]?.month ?? view.next.month);
    setDate(view.next.through);
  }, [view.lockable, view.next]);

  const selectedThrough = useMemo(() => {
    if (mode === "date") return date;
    return lockThroughMonth(view.year, month);
  }, [mode, date, view.year, month]);

  const canLock =
    view.lockable.length > 0 ||
    (mode === "date" && selectedThrough > (view.lockedThrough ?? ""));

  function goYear(year: number) {
    router.push(`${companyHref(companyId, "periodlasning")}?ar=${year}`);
  }

  function submit() {
    if (pending) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await lockPeriod(companyId, selectedThrough);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(`Låst t.o.m. ${formatIsoDateSv(result.lockedThrough)}.`);
    });
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Periodlåsning
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {companyName}
          <span className="mx-2 text-neutral-300">·</span>
          <span className="tabular-nums">{orgNumber}</span>
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-neutral-700">
          {view.lockedThrough ? (
            <>
              <span className="font-medium text-neutral-900">
                Låst t.o.m. {formatIsoDateSv(view.lockedThrough)}
              </span>
              <span className="mx-2 text-neutral-300">·</span>
              Verifikationer i den perioden kan inte registreras eller ändras.
            </>
          ) : (
            <>
              <span className="font-medium text-neutral-900">
                Inga perioder är låsta
              </span>
              <span className="mx-2 text-neutral-300">·</span>
              Lås framifrån, en månad i taget eller till och med valt datum.
            </>
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Lås
            <select
              value={mode}
              onChange={(event) =>
                setMode(event.target.value as "month" | "date")
              }
              className={fieldClass}
            >
              <option value="month">till och med månad</option>
              <option value="date">till och med datum</option>
            </select>
          </label>

          {mode === "month" ? (
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Månad
              <select
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className={fieldClass}
                disabled={view.lockable.length === 0}
              >
                {view.lockable.length === 0 ? (
                  <option value={defaultMonth}>
                    {formatMonthYear(view.next.year, view.next.month)}
                  </option>
                ) : (
                  view.lockable.map((option) => (
                    <option key={option.through} value={option.month}>
                      {option.label}
                    </option>
                  ))
                )}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
              Datum
              <input
                type="date"
                value={date}
                min={view.next.through}
                onChange={(event) => setDate(event.target.value)}
                className={`${fieldClass} tabular-nums`}
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            År
            <select
              value={view.year}
              onChange={(event) => goYear(Number(event.target.value))}
              className={fieldClass}
            >
              {view.years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            id="las-period"
            onClick={submit}
            disabled={pending || !canLock}
            className="h-9 rounded-md bg-neutral-900 px-3.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Låser…" : "Lås period"}
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-neutral-500">
          Perioder låses alltid framifrån. Väljer du{" "}
          {lockLabel(view.next, selectedThrough)} låses alla datum t.o.m.{" "}
          {formatIsoDateSv(selectedThrough)}. Inget årsavslut.
        </p>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="mt-3 text-sm font-medium text-emerald-800">
            {notice}
          </p>
        ) : null}
      </section>

      <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-2.5 text-left font-medium">Månad</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">
                Verifikationer
              </th>
            </tr>
          </thead>
          <tbody>
            {view.months.map((row) => (
              <tr
                key={row.month}
                className={`border-t border-neutral-100 ${
                  row.status === "locked"
                    ? "bg-neutral-50"
                    : row.status === "partial"
                      ? "bg-amber-50"
                      : ""
                }`}
              >
                <td className="px-4 py-2 capitalize text-neutral-900">
                  {row.name}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      row.status === "open"
                        ? "text-emerald-800"
                        : row.status === "partial"
                          ? "text-amber-900"
                          : "text-neutral-600"
                    }
                  >
                    {row.statusLabel}
                  </span>
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-neutral-700">
                  {row.voucherCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function lockLabel(next: NextLockTarget, through: string): string {
  if (through === next.through) {
    return formatMonthYear(next.year, next.month);
  }
  return formatIsoDateSv(through);
}
