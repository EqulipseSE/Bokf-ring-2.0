import type { VatPeriod } from "@/lib/vat-declaration";
import { PeriodPicker } from "./momsdeklaration/period-picker";

export function ReportHeader({
  title,
  companyName,
  orgNumber,
  period,
  action,
  years,
  periodVoucherCount,
  openingVoucherCount,
}: {
  title: string;
  companyName: string;
  orgNumber: string;
  period: VatPeriod;
  action: string;
  years: number[];
  periodVoucherCount: number;
  openingVoucherCount: number;
}) {
  const voucherLabel =
    periodVoucherCount === 0
      ? "Inga löpande verifikationer i perioden"
      : `${periodVoucherCount} ${
          periodVoucherCount === 1 ? "verifikation" : "verifikationer"
        } i perioden`;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {title}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {companyName}
          <span className="mx-2 text-neutral-300">·</span>
          <span className="tabular-nums">{orgNumber}</span>
        </p>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <PeriodPicker action={action} period={period} years={years} />
        <p className="mt-3 text-sm text-neutral-600">
          <span className="font-medium text-neutral-800">{period.label}</span>
          <span className="mx-2 text-neutral-300">·</span>
          <span className="tabular-nums">
            {period.from} – {period.to}
          </span>
          <span className="mx-2 text-neutral-300">·</span>
          {voucherLabel}
          {openingVoucherCount > 0 ? (
            <>
              <span className="mx-2 text-neutral-300">·</span>
              IB ingår
            </>
          ) : null}
        </p>
      </section>
    </>
  );
}
