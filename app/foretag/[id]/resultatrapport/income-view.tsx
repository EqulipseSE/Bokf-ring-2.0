import { formatOre } from "@/lib/money";
import type { IncomeReport } from "@/lib/financial-reports";
import type { VatPeriod } from "@/lib/vat-declaration";
import { ReportHeader } from "../report-header";
import { ReportTable } from "../report-table";

export function IncomeView({
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
  report: IncomeReport;
  periodVoucherCount: number;
  openingVoucherCount: number;
  action: string;
  years: number[];
}) {
  const resultLabel =
    report.result.ytdOre > 0
      ? "Vinst"
      : report.result.ytdOre < 0
        ? "Förlust"
        : "Nollresultat";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <ReportHeader
        title="Resultatrapport"
        companyName={companyName}
        orgNumber={orgNumber}
        period={period}
        action={action}
        years={years}
        periodVoucherCount={periodVoucherCount}
        openingVoucherCount={openingVoucherCount}
      />

      <ReportTable
        columns="resultat"
        blocks={[report.income, report.expenses]}
        footer={
          <tbody className="border-t border-neutral-200">
            <tr className="bg-amber-50">
              <td className="px-4 py-2.5" />
              <td className="px-3 py-2.5 font-semibold text-neutral-900">
                Resultat
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold tabular-nums text-neutral-900">
                {formatOre(report.result.periodOre)}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold tabular-nums text-neutral-900">
                {formatOre(report.result.ytdOre)}
              </td>
            </tr>
          </tbody>
        }
      />

      <p className="mt-4 text-sm text-neutral-700">
        <span className="font-medium">{resultLabel}</span>
        {report.result.ytdOre !== 0 ? (
          <>
            {", ackumulerat "}
            <span className="font-mono tabular-nums">
              {formatOre(Math.abs(report.result.ytdOre))} kr
            </span>
          </>
        ) : null}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-neutral-500">
        Intäkter är kontoklass 3, kostnader klass 4–8. Perioden är löpande
        verifikationer i valt intervall. Ackumulerat räknas från årets början
        (plus ev. IB på resultaträkningen) till periodens slut. Nollkonton
        döljs.
      </p>
    </main>
  );
}
