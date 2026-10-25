import { formatOre } from "@/lib/money";
import {
  VAT_BOX_LABELS,
  VAT_BOX_SECTIONS,
  type VatBoxId,
  type VatPeriod,
} from "@/lib/vat-declaration";
import { PeriodPicker } from "./period-picker";

export function DeclarationView({
  companyName,
  orgNumber,
  period,
  boxes,
  lineCount,
  voucherCount,
  action,
  years,
}: {
  companyName: string;
  orgNumber: string;
  period: VatPeriod;
  boxes: Record<VatBoxId, number>;
  lineCount: number;
  voucherCount: number;
  action: string;
  years: number[];
}) {
  const toPay = boxes["49"];
  const toPayLabel =
    toPay > 0
      ? "Moms att betala"
      : toPay < 0
        ? "Moms att få tillbaka"
        : "Ingen moms att betala eller få tillbaka";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Momsdeklaration
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
          {voucherCount === 0
            ? "Inga verifikationer i perioden"
            : `${voucherCount} ${voucherCount === 1 ? "verifikation" : "verifikationer"}, ${lineCount} rader`}
        </p>
      </section>

      <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <th className="w-14 px-4 py-2.5 text-left font-medium">Ruta</th>
              <th className="px-4 py-2.5 text-left font-medium">Benämning</th>
              <th className="w-36 px-4 py-2.5 text-right font-medium">Belopp</th>
            </tr>
          </thead>
          {VAT_BOX_SECTIONS.map((section) => (
            <tbody key={section.id} className="border-t border-neutral-200">
              <tr className="bg-neutral-50">
                <td
                  colSpan={3}
                  className="px-4 py-2 text-xs font-semibold tracking-wide text-neutral-700"
                >
                  {section.title}
                </td>
              </tr>
              {section.boxes.map((box) => {
                const amount = boxes[box];
                const isTotal = box === "49";
                const zero = amount === 0;
                return (
                  <tr
                    key={box}
                    className={
                      isTotal
                        ? "bg-amber-50"
                        : "border-t border-neutral-100"
                    }
                  >
                    <td className="px-4 py-2 align-top">
                      <span
                        className={`inline-flex min-w-8 justify-center rounded border px-1.5 py-0.5 font-mono text-xs tabular-nums ${
                          isTotal
                            ? "border-amber-300 bg-amber-100 font-semibold text-neutral-900"
                            : "border-neutral-200 bg-neutral-50 text-neutral-700"
                        }`}
                      >
                        {box}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-2 ${
                        isTotal
                          ? "font-medium text-neutral-900"
                          : "text-neutral-800"
                      }`}
                    >
                      {VAT_BOX_LABELS[box]}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-mono tabular-nums ${
                        isTotal
                          ? "font-semibold text-neutral-900"
                          : zero
                            ? "text-neutral-400"
                            : "text-neutral-900"
                      }`}
                    >
                      {formatOre(amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      <p className="mt-4 text-sm text-neutral-700">
        <span className="font-medium">{toPayLabel}</span>
        {toPay !== 0 ? (
          <>
            {": "}
            <span className="font-mono tabular-nums">
              {formatOre(Math.abs(toPay))} kr
            </span>
          </>
        ) : null}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-neutral-500">
        Utkast, summerat från bokförda verifikationsrader. Ingående balanser
        räknas inte med. U25 → ruta 05/10, U12 → 06/11, U6 → 07/12, I25/I12/I6 →
        48, MF → 41, UEU → 35, IEU → 20, UOS → 40/30, IOS → 24/48. Momskonto
        26xx bär momsen, övriga konton underlaget. Ingen eSKD-fil ännu.
      </p>
    </main>
  );
}
