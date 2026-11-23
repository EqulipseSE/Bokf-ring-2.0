import type { PdfRun } from "@/lib/pdf-runs";
import type { SuggestedPosting } from "@/lib/voucher-suggestion";

function parseOre(value: string): number | null {
  const normalized = value.replace(/[\s\u00a0]/g, "").replace(",", ".");
  if (!/^\d+\.\d{2}$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

type Piece = { line: number; x: number; text: string };

/** Konto och belopp från ett löneunderlag. Bankraden lämnas, den kommer från transaktionen. */
export function salaryPostings(runs: readonly PdfRun[], bankAccountNumber: string): SuggestedPosting[] {
  const rows = new Map<number, PdfRun[]>();
  for (const run of runs) {
    const row = rows.get(run.line) ?? [];
    row.push(run);
    rows.set(run.line, row);
  }
  const pieces: Piece[] = [...rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([line, row]) => {
      const ordered = [...row].sort((a, b) => a.x - b.x);
      return { line, x: ordered[0]?.x ?? 0, text: ordered.map((run) => run.text).join("") };
    });

  let debitX: number | null = null;
  let creditX: number | null = null;
  for (const piece of pieces) {
    const label = piece.text.trim().toLocaleLowerCase("sv");
    if (label === "debet") debitX = piece.x;
    if (label === "kredit") creditX = piece.x;
  }
  if (debitX == null || creditX == null || creditX <= debitX) return [];
  const splitX = (debitX + creditX) / 2;

  const postings: SuggestedPosting[] = [];
  let account = "";
  let label = "";
  let amount = "";
  let amountX = 0;

  function flush() {
    const ore = parseOre(amount);
    if (/^\d{4}$/.test(account) && account !== bankAccountNumber && ore != null && ore > 0 && !label.toLocaleLowerCase("sv").includes("omslutning")) {
      const credit = amountX >= splitX;
      postings.push({
        accountNumber: account,
        debitOre: credit ? 0 : ore,
        creditOre: credit ? ore : 0,
      });
    }
    account = "";
    label = "";
    amount = "";
  }

  for (const piece of pieces) {
    const text = piece.text.trim();
    if (/^\d{4}$/.test(text) || text.toLocaleLowerCase("sv") === "omslutning") {
      flush();
      account = /^\d{4}$/.test(text) ? text : "";
      label = text;
      continue;
    }
    if (!account) continue;
    label += ` ${text}`;
    if (!amount && /^\d{1,3}$/.test(text)) {
      amount = text;
      amountX = piece.x;
    } else if (amount && /^\d{3},\d{2}$/.test(text)) {
      amount += text;
    }
  }
  flush();
  return postings;
}
