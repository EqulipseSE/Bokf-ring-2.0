"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  formatIsoDateSv,
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
  const lockable = view.lockable.filter(
    (option) => !view.lockedThrough || option.through > view.lockedThrough
  );
  const firstThrough = lockable[0]?.through ?? "";

  const [through, setThrough] = useState(firstThrough);

  useEffect(() => {
    setThrough(firstThrough);
  }, [firstThrough]);

  const selected =
    lockable.find((option) => option.through === through) ?? lockable[0];
  const canLock = Boolean(selected);

  function goYear(year: number) {
    router.push(`${companyHref(companyId, "periodlasning")}?ar=${year}`);
  }

  function submit() {
    if (pending || !selected) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await lockPeriod(companyId, selected.through);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(`Låst t.o.m. ${formatIsoDateSv(result.lockedThrough)}.`);
      router.refresh();
    });
  }

  const unit =
    view.kind === "kvartal"
      ? "kvartal"
      : view.kind === "ar"
        ? "år"
        : "månad";

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
          <span className="mx-2 text-neutral-300">·</span>
          Momsperiod {view.kindLabel.toLowerCase()}
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
              Lås framifrån, ett {unit} i taget enligt momsperioden.
            </>
          )}
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
            Lås till och med
            <select
              id="las-till-period"
              value={through}
              onChange={(event) => setThrough(event.target.value)}
              className={fieldClass}
              disabled={!canLock}
            >
              {canLock ? (
                lockable.map((option) => (
                  <option key={option.through} value={option.through}>
                    {option.label}
                  </option>
                ))
              ) : (
                <option value="">Inga perioder att låsa</option>
              )}
            </select>
          </label>

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
          {view.kind === "kvartal"
            ? "Kvartalsmoms: bara hela kvartal (jan–mar, apr–jun, jul–sep, okt–dec)."
            : view.kind === "ar"
              ? "Helårsmoms: ett lock låser hela kalenderåret."
              : "Månadsmoms: lås en månad i taget framifrån."}{" "}
          {canLock && selected ? (
            <>
              Väljer du {selected.label} låses alla datum t.o.m.{" "}
              {formatIsoDateSv(selected.through)}. Inget årsavslut.
            </>
          ) : (
            <>Inga fler perioder att låsa {view.year}. Inget årsavslut.</>
          )}
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
              <th className="px-4 py-2.5 text-left font-medium">Period</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">
                Verifikationer
              </th>
            </tr>
          </thead>
          <tbody>
            {view.periods.map((row) => (
              <tr
                key={row.number}
                className={`border-t border-neutral-100 ${
                  row.status === "locked"
                    ? "bg-neutral-50"
                    : row.status === "partial"
                      ? "bg-amber-50"
                      : ""
                }`}
              >
                <td className="px-4 py-2 text-neutral-900">{row.label}</td>
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
