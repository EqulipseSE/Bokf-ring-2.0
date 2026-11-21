import type { Metadata } from "next";
import { listSuppliers } from "@/lib/suppliers";

export const metadata: Metadata = { title: "Leverantörer" };

const COLUMNS = [
  "Markering",
  "Dölj",
  "Leverantörsnummer",
  "Namn",
  "Typ",
  "Telefon",
  "Adress",
  "Postnummer/Ort",
  "Skuld",
] as const;

export default async function LeverantorerPage({
  params,
}: PageProps<"/foretag/[id]/leverantorer">) {
  const { id } = await params;
  const rows = await listSuppliers(id);

  return (
    <main className="w-full flex-1">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-100 text-left text-xs font-medium text-neutral-600">
            {COLUMNS.map((label) => (
              <th
                key={label}
                className={`whitespace-nowrap py-1.5 font-medium ${
                  label === "Markering" || label === "Dölj" ? "w-0 px-1.5" : "px-3"
                }`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="px-3 py-6 text-sm text-neutral-500">
                Inga leverantörer ännu.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100">
                <td className="px-1.5" />
                <td className="px-1.5" />
                <td className="px-3 py-1 tabular-nums">{row.number}</td>
                <td className="px-3 py-1">{row.name}</td>
                <td className="px-3 py-1" />
                <td className="px-3 py-1" />
                <td className="px-3 py-1" />
                <td className="px-3 py-1" />
                <td className="px-3 py-1" />
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}
