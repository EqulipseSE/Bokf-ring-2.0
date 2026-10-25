"use client";

import { useRouter } from "next/navigation";
import { MONTH_NAMES, type VatPeriod } from "@/lib/vat-declaration";

const fieldClass =
  "h-9 rounded-md border border-neutral-300 bg-white px-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200";

export function PeriodPicker({
  action,
  period,
  years,
}: {
  action: string;
  period: VatPeriod;
  years: number[];
}) {
  const router = useRouter();

  function navigate(next: { kind?: VatPeriod["kind"]; year?: number; number?: number }) {
    const kind = next.kind ?? period.kind;
    const year = next.year ?? period.year;
    let number = next.number ?? period.number;
    if (next.kind && next.kind !== period.kind) {
      if (next.kind === "kvartal" && period.kind === "manad") {
        number = Math.ceil(period.number / 3);
      } else if (next.kind === "manad" && period.kind === "kvartal") {
        number = (period.number - 1) * 3 + 1;
      } else if (next.kind === "ar") {
        number = 1;
      }
    }
    const params = new URLSearchParams({
      typ: kind,
      ar: String(year),
      nr: String(number),
    });
    router.push(`${action}?${params.toString()}`);
  }

  return (
    <form
      method="get"
      action={action}
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        navigate({
          kind: String(data.get("typ")) as VatPeriod["kind"],
          year: Number(data.get("ar")),
          number: Number(data.get("nr") ?? 1),
        });
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        Period
        <select
          name="typ"
          value={period.kind}
          onChange={(event) =>
            navigate({ kind: event.target.value as VatPeriod["kind"] })
          }
          className={fieldClass}
        >
          <option value="manad">Månad</option>
          <option value="kvartal">Kvartal</option>
          <option value="ar">År</option>
        </select>
      </label>

      {period.kind === "manad" ? (
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Månad
          <select
            name="nr"
            value={period.number}
            onChange={(event) => navigate({ number: Number(event.target.value) })}
            className={fieldClass}
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {period.kind === "kvartal" ? (
        <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
          Kvartal
          <select
            name="nr"
            value={period.number}
            onChange={(event) => navigate({ number: Number(event.target.value) })}
            className={fieldClass}
          >
            <option value={1}>1 (jan–mar)</option>
            <option value={2}>2 (apr–jun)</option>
            <option value={3}>3 (jul–sep)</option>
            <option value={4}>4 (okt–dec)</option>
          </select>
        </label>
      ) : null}

      <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
        År
        <select
          name="ar"
          value={period.year}
          onChange={(event) => navigate({ year: Number(event.target.value) })}
          className={fieldClass}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="h-9 rounded-md bg-neutral-900 px-3.5 text-sm font-medium text-white transition hover:bg-neutral-700"
      >
        Visa
      </button>
    </form>
  );
}
