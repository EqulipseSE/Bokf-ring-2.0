export type DocumentIdentity = {
  contentHash: string;
  ocrNumber: string | null;
  invoiceNumber: string | null;
  totalOre: number | null;
  reminder: boolean;
};

export type StoredDocumentIdentity = {
  contentHash: string | null;
  ocrNumber: string | null;
  invoiceNumber: string | null;
  totalOre: number | null;
};

function parseOre(value: string): number | null {
  const normalized = value.replace(/[\s\u00a0.]/g, "").replace(",", ".");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

function lastMoney(text: string, pattern: RegExp): number | null {
  let found: number | null = null;
  for (const match of text.matchAll(pattern)) {
    const amount = parseOre(match[1] ?? "");
    if (amount != null) found = amount;
  }
  return found;
}

/** OCR, fakturanummer, totalsumma och om texten är en påminnelse. */
export function readDocumentIdentity(
  fileName: string,
  text: string,
  contentHash: string
): DocumentIdentity {
  const haystack = `${fileName}\n${text}`;
  const ocr = haystack.match(
    /(?:ocr|referens(?:nummer)?)(?:\s*-?\s*nr|\s*nummer)?\s*[:.]?\s*(\d[\d\s]{3,})/i
  );
  const invoice = haystack.match(
    /fakturan(?:ummer|r\.?|umre)\s*[:.#]?\s*([a-z0-9-]{3,})/i
  );
  const fromName = fileName.match(/faktura[\s._-]*(\d{4,})/i) ?? fileName.match(/^(\d{4,})\.[a-z]+$/i);
  const total =
    lastMoney(
      haystack,
      /(?:att\s+betala|totalsumma|summa\s+att\s+betala|förfallobelopp|forfallobelopp)\s*[:.]?\s*([\d\s.\u00a0]+,\d{2})/gi
    ) ??
    lastMoney(haystack, /(?:^|\n)\s*totalt\s*[:.]?\s*([\d\s.\u00a0]+,\d{2})/gi);

  return {
    contentHash,
    ocrNumber: ocr ? ocr[1].replace(/\D/g, "") : null,
    invoiceNumber: (invoice?.[1] ?? fromName?.[1] ?? "").toLocaleLowerCase("sv") || null,
    totalOre: total,
    reminder: /påminnelse|paminnelse/.test(haystack.toLocaleLowerCase("sv")),
  };
}

function sameInvoice(stored: StoredDocumentIdentity, incoming: DocumentIdentity): boolean {
  if (incoming.ocrNumber && stored.ocrNumber && incoming.ocrNumber === stored.ocrNumber) return true;
  if (
    incoming.invoiceNumber &&
    stored.invoiceNumber &&
    incoming.invoiceNumber === stored.invoiceNumber
  ) {
    return true;
  }
  return false;
}

/** Null när underlaget får sparas. */
export function duplicateDocumentMessage(
  existing: StoredDocumentIdentity[],
  incoming: DocumentIdentity
): string | null {
  if (
    incoming.contentHash &&
    existing.some((row) => row.contentHash && row.contentHash === incoming.contentHash)
  ) {
    return "Underlaget finns redan.";
  }

  const same = existing.filter((row) => sameInvoice(row, incoming));
  if (same.length === 0) return null;

  const knownTotals = same.filter((row) => row.totalOre != null);
  const differentTotal =
    incoming.reminder &&
    incoming.totalOre != null &&
    knownTotals.length > 0 &&
    knownTotals.every((row) => row.totalOre !== incoming.totalOre);

  if (differentTotal) return null;
  return "Fakturan finns redan. En påminnelse går att lägga in om totalsumman skiljer sig.";
}
