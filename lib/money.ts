/** Tolkar ett belopp i kronor (1 250,50 / 1250.50 / 1250) till öre. Tom sträng → 0. */
export function parseAmountToOre(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Math.round(Number(trimmed) * 100);
}

/** Som parseAmountToOre men tillåter minus (saldo kan vara kredit). */
export function parseSignedAmountToOre(value: string): number | null {
  const trimmed = value
    .trim()
    .replace(/\s/g, "")
    .replace(/[−–]/g, "-")
    .replace(",", ".");
  if (!trimmed) return 0;
  const match = /^([+-])?(\d+(\.\d{1,2})?)$/.exec(trimmed);
  if (!match) return null;
  const ore = Math.round(Number(match[2]) * 100);
  return match[1] === "-" ? -ore : ore;
}

export function formatOre(ore: number): string {
  return (ore / 100).toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Kompakt visning i beloppsfält, t.ex. 1000,00 */
export function formatOreInput(ore: number): string {
  return (ore / 100).toFixed(2).replace(".", ",");
}

/** 100 → 100,00, 100,5 → 100,50, 100,50 lämnas. Ogiltigt värde lämnas orört. */
export function completeAmountDecimals(value: string): string {
  const trimmed = value.trim().replace(/\s/g, "").replace(/[−–]/g, "-");
  if (!trimmed) return "";
  const match = /^([+-])?(\d+)(?:[,.](\d{0,2}))?$/.exec(trimmed);
  if (!match) return value;
  const sign = match[1] === "-" ? "-" : "";
  return `${sign}${match[2]},${(match[3] ?? "").padEnd(2, "0")}`;
}

/** En serie: bara löpnummer. Flera serier: A1, B1, … */
export function voucherNumberLabel(
  letter: string,
  number: number,
  seriesCount: number
): string {
  return seriesCount > 1 ? `${letter}${number}` : String(number);
}
