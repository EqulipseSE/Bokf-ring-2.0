export type BalanceKind = "opening" | "closing";

export type AdjustmentLine = {
  accountId: string;
  debitOre: number;
  creditOre: number;
};

export function linesForBalanceDiff(
  accountId: string,
  contraAccountId: string,
  diffOre: number
): { ok: true; lines: AdjustmentLine[] } | { ok: false; error: string } {
  if (!accountId || !contraAccountId) {
    return { ok: false, error: "Välj ett motkonto." };
  }
  if (accountId === contraAccountId) {
    return { ok: false, error: "Motkontot måste vara ett annat konto." };
  }
  if (!Number.isInteger(diffOre) || diffOre === 0) {
    return { ok: false, error: "Ange ett nytt belopp." };
  }

  const amount = Math.abs(diffOre);
  if (diffOre > 0) {
    return {
      ok: true,
      lines: [
        { accountId, debitOre: amount, creditOre: 0 },
        { accountId: contraAccountId, debitOre: 0, creditOre: amount },
      ],
    };
  }
  return {
    ok: true,
    lines: [
      { accountId, debitOre: 0, creditOre: amount },
      { accountId: contraAccountId, debitOre: amount, creditOre: 0 },
    ],
  };
}

export function balanceAdjustmentText(
  kind: BalanceKind,
  number: string,
  name: string
): string {
  const label = kind === "opening" ? "Ingående saldo" : "Utgående saldo";
  return `${label} ${number} ${name}`.trim();
}
