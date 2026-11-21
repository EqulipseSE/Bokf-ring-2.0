/** Bokföringskonto för ett bankkonto, utifrån ingående saldo i ören. */
export function bookAccountForOpeningBalance(openingOre: number): string | null {
  if (openingOre === 0) return "1930";
  return null;
}
