import type { ReactNode } from "react";
import { formatOre } from "@/lib/money";
import type { ReportAccountRow, ReportBlock } from "@/lib/financial-reports";

function AmountCell({
  ore,
  emphasize = false,
}: {
  ore: number;
  emphasize?: boolean;
}) {
  const zero = ore === 0;
  return (
    <td
      className={`px-3 py-1.5 text-right font-mono tabular-nums ${
        emphasize
          ? "font-semibold text-neutral-900"
          : zero
            ? "text-neutral-400"
            : "text-neutral-900"
      }`}
    >
      {formatOre(ore)}
    </td>
  );
}

function AccountRow({
  row,
  columns,
}: {
  row: ReportAccountRow;
  columns: "balans" | "resultat";
}) {
  return (
    <tr className="border-t border-neutral-100">
      <td className="px-4 py-1.5 font-mono text-xs tabular-nums text-neutral-500">
        {row.number}
      </td>
      <td className="px-3 py-1.5 text-neutral-800">{row.name}</td>
      {columns === "balans" ? <AmountCell ore={row.openingOre} /> : null}
      <AmountCell ore={row.periodOre} />
      <AmountCell ore={row.closingOre} />
    </tr>
  );
}

export function ReportTable({
  blocks,
  columns,
  footer,
}: {
  blocks: ReportBlock[];
  columns: "balans" | "resultat";
  footer?: ReactNode;
}) {
  const colCount = columns === "balans" ? 5 : 4;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <th className="w-20 px-4 py-2.5 text-left font-medium">Konto</th>
            <th className="px-3 py-2.5 text-left font-medium">Benämning</th>
            {columns === "balans" ? (
              <th className="w-32 px-3 py-2.5 text-right font-medium">
                Ingående
              </th>
            ) : null}
            <th className="w-32 px-3 py-2.5 text-right font-medium">Period</th>
            <th className="w-32 px-3 py-2.5 text-right font-medium">
              {columns === "balans" ? "Utgående" : "Ackumulerat"}
            </th>
          </tr>
        </thead>
        {blocks.map((block) => (
          <tbody key={block.id} className="border-t border-neutral-200">
            <tr className="bg-neutral-100">
              <td
                colSpan={colCount}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-800"
              >
                {block.title}
              </td>
            </tr>
            {block.groups.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  className="px-4 py-3 text-sm text-neutral-500"
                >
                  Inga belopp i perioden.
                </td>
              </tr>
            ) : (
              block.groups.flatMap((group) => [
                <tr key={`${block.id}-${group.code}-h`} className="bg-neutral-50">
                  <td
                    colSpan={colCount}
                    className="px-4 py-1.5 text-xs font-medium text-neutral-600"
                  >
                    {group.code === "resultat"
                      ? group.title
                      : `${group.code} ${group.title}`}
                  </td>
                </tr>,
                ...group.accounts.map((row) => (
                  <AccountRow
                    key={`${block.id}-${group.code}-${row.number || row.name}`}
                    row={row}
                    columns={columns}
                  />
                )),
              ])
            )}
            <tr className="border-t border-neutral-200 bg-neutral-50">
              <td className="px-4 py-2" />
              <td className="px-3 py-2 font-medium text-neutral-900">
                Summa {block.title.toLowerCase()}
              </td>
              {columns === "balans" ? (
                <AmountCell ore={block.openingOre} emphasize />
              ) : null}
              <AmountCell ore={block.periodOre} emphasize />
              <AmountCell ore={block.closingOre} emphasize />
            </tr>
          </tbody>
        ))}
        {footer}
      </table>
    </div>
  );
}
