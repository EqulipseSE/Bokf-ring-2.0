import { formatOre } from "@/lib/money";
import type { BalanceReport } from "@/lib/financial-reports";
import type { VatPeriod } from "@/lib/vat-declaration";
import { ReportHeader } from "../report-header";
import { ReportTable } from "../report-table";

export function BalanceView({
  companyName,
  orgNumber,
  period,
  report,
  periodVoucherCount,
  openingVoucherCount,
  action,
  years,
}: {
  companyName: string;
  orgNumber: string;
  period: VatPeriod;
  report: BalanceReport;
  periodVoucherCount: number;
  openingVoucherCount: number;
  action: string;
  years: number[];
}) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <ReportHeader
        title="Balansrapport"
        companyName={companyName}
        orgNumber={orgNumber}
        period={period}
        action={action}
        years={years}
        periodVoucherCount={periodVoucherCount}
        openingVoucherCount={openingVoucherCount}
      />

      <ReportTable
        columns="balans"
        blocks={[report.assets, report.equityAndLiabilities]}
      />

      <p className="mt-4 text-sm text-neutral-700">
        {report.balanced ? (
          <>
            Tillgångar och eget kapital/skulder stämmer överens
            {report.assets.closingOre !== 0 ? (
              <>
                {": "}
                <span className="font-mono tabular-nums">
                  {formatOre(report.assets.closingOre)} kr
                </span>
              </>
            ) : null}
            .
          </>
        ) : (
          <>
            Rapporten balanserar inte. Tillgångar{" "}
            <span className="font-mono tabular-nums">
              {formatOre(report.assets.closingOre)}
            </span>{" "}
            mot eget kapital och skulder{" "}
            <span className="font-mono tabular-nums">
              {formatOre(report.equityAndLiabilities.closingOre)}
            </span>
            .
          </>
        )}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-neutral-500">
        Ingående saldo är IB-verifikationer plus löpande bokföring före
        perioden. Perioden är löpande verifikationer i valt intervall.
        Utgående = ingående + period. Beräknat resultat från kontoklass 3–8
        läggs under eget kapital så att rapporten balanserar. Nollkonton
        döljs.
      </p>
    </main>
  );
}
