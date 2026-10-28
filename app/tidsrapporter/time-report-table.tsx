import type { TimeReportRow } from "@/lib/time-reports";

export function TimeReportTable({ rows }: { rows: TimeReportRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-5 py-3.5 font-medium">Företag</th>
            <th className="px-5 py-3.5 font-medium">Månad</th>
            <th className="px-5 py-3.5 text-right font-medium">Timmar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr key={`${row.companyId}-${row.yearMonth}`}>
              <td className="px-5 py-4 font-medium text-neutral-900">
                {row.companyName}
              </td>
              <td className="px-5 py-4 text-neutral-700">{row.monthLabel}</td>
              <td className="px-5 py-4 text-right tabular-nums text-neutral-900">
                {row.hoursLabel}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
