import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatOre } from "@/lib/money";
import { getVoucher } from "@/lib/vouchers";

export async function generateMetadata({
  params,
}: PageProps<"/foretag/[id]/verifikationer/[voucherId]">): Promise<Metadata> {
  const { id, voucherId } = await params;
  const voucher = await getVoucher(id, voucherId);
  return { title: voucher ? voucher.numberLabel : "Verifikation" };
}

export default async function VerifikationPage({
  params,
}: PageProps<"/foretag/[id]/verifikationer/[voucherId]">) {
  const { id, voucherId } = await params;
  const voucher = await getVoucher(id, voucherId);
  if (!voucher) notFound();

  const listHref = `/foretag/${id}/verifikationer`;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <Link
        href={listHref}
        className="text-sm text-neutral-500 transition hover:text-neutral-900"
      >
        ← Tillbaka till verifikationer
      </Link>

      <div className="mt-4 mb-8">
        <p className="text-sm text-neutral-500">Verifikation</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
          {voucher.numberLabel}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Sparad av {voucher.registeredByName} · kan inte ändras
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <dl className="grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Datum</dt>
            <dd className="mt-1 tabular-nums text-neutral-900">{voucher.date}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">Text</dt>
            <dd className="mt-1 text-neutral-900">{voucher.text}</dd>
          </div>
        </dl>

        <table className="mt-8 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th className="pb-3 font-medium">Konto</th>
              <th className="pb-3 text-right font-medium">Debet</th>
              <th className="pb-3 text-right font-medium">Kredit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {voucher.lines.map((line) => (
              <tr key={line.lineNumber}>
                <td className="py-3 text-neutral-900">
                  <span className="mr-3 tabular-nums text-neutral-500">
                    {line.accountNumber}
                  </span>
                  {line.accountName}
                </td>
                <td className="py-3 text-right tabular-nums text-neutral-900">
                  {line.debit > 0 ? formatOre(line.debit) : ""}
                </td>
                <td className="py-3 text-right tabular-nums text-neutral-900">
                  {line.credit > 0 ? formatOre(line.credit) : ""}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200">
              <th className="pt-4 text-left text-sm font-medium text-neutral-700">
                Summa
              </th>
              <td className="pt-4 text-right text-sm font-medium tabular-nums text-neutral-900">
                {formatOre(voucher.debitOre)}
              </td>
              <td className="pt-4 text-right text-sm font-medium tabular-nums text-neutral-900">
                {formatOre(voucher.creditOre)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </main>
  );
}
