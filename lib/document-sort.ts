import type { DocumentKind } from "@/lib/document-kind";
import { skipsSupplierLedger } from "@/lib/voucher-suggestion";

export type DocumentGuess = {
  kind: DocumentKind;
  sure: boolean;
};

export type CompanyMarks = {
  name: string;
  orgNumber?: string | null;
  bankgiro?: string | null;
  plusgiro?: string | null;
};

/** Läser lös text ur en PDF. Skannade sidor utan textlager ger tom sträng. */
export function textFromPdfBytes(bytes: Uint8Array): string {
  const raw = new TextDecoder("latin1").decode(bytes);
  const parts: string[] = [];
  const literal = /\((?:\\\)|\\.|[^)]){2,200}\)/g;
  for (const match of raw.matchAll(literal)) {
    parts.push(
      match[0]
        .slice(1, -1)
        .replace(/\\n/g, " ")
        .replace(/\\[()\\]/g, (token) => token.slice(1))
    );
  }
  return parts.join(" ");
}

function digits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function orgNumbers(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(/\b(\d{6})-?(\d{4})\b/g)) {
    const number = `${match[1]}${match[2]}`;
    if (!found.includes(number)) found.push(number);
  }
  return found;
}

function giroNumbers(text: string, pattern: RegExp): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(pattern)) {
    const number = [match[1], match[2]].filter(Boolean).join("");
    if (!number) continue;
    if (!found.includes(number)) found.push(number);
  }
  return found;
}

/**
 * Kundfaktura och leverantörsfaktura skiljs åt med vem som ska ha betalt.
 * Träff på företagets bankgiro, plusgiro eller organisationsnummer betyder
 * att fakturan är utställd av företaget. Ett annat nummer är en leverantör.
 */
export function guessDocumentKind(fileName: string, text: string, company: CompanyMarks): DocumentGuess {
  const haystack = `${fileName} ${text}`.toLocaleLowerCase("sv");
  const ownOrg = digits(company.orgNumber);
  const ownBg = digits(company.bankgiro);
  const ownPg = digits(company.plusgiro);
  const orgs = orgNumbers(text);
  const bankgiros = giroNumbers(
    text,
    /(?:bankgiro|\bbg)(?:\s*nr|\s*nummer)?\s*[:.]?\s*(\d{3,4})[\s-]?(\d{4})/gi
  );
  const plusgiros = giroNumbers(
    text,
    /(?:plusgiro|\bpg)(?:\s*nr|\s*nummer)?\s*[:.]?\s*(\d{2,8})/gi
  );
  const looksLikeInvoice = /faktura/.test(haystack) || bankgiros.length > 0 || plusgiros.length > 0 || orgs.length > 0;

  if (/försäkringsbrev|forsakringsbrev|journal|bokföringsorder|bokforingsorder/.test(haystack)) {
    return { kind: "ovrigt", sure: true };
  }

  if (
    /^lön[\s._-]/i.test(fileName) ||
    /lönebesked|lonebesked|löneunderlag|loneunderlag|lönespecifikation|lonespecifikation|bruttolön/.test(
      haystack
    )
  ) {
    return { kind: "lon", sure: true };
  }

  if (/kvitto|kassakvitto|kortköp|kortkop|tack för (ditt |ert )?köp/.test(haystack) && !looksLikeInvoice) {
    return { kind: "kvitto", sure: true };
  }

  const ownPayee =
    (ownBg !== "" && bankgiros.includes(ownBg)) ||
    (ownPg !== "" && plusgiros.includes(ownPg));
  const foreignPayee =
    bankgiros.some((number) => number !== ownBg) ||
    plusgiros.some((number) => number !== ownPg);
  const companyName = company.name.trim().toLocaleLowerCase("sv");
  const billedTo = text.match(/(?:faktureras till|kund)\s+(.{2,80})/i)?.[1]?.toLocaleLowerCase("sv") ?? "";
  const billedToUs = companyName.length > 2 && billedTo.includes(companyName);

  if (looksLikeInvoice && ownPayee && !foreignPayee) {
    return { kind: "kundfaktura", sure: true };
  }
  if (looksLikeInvoice && billedToUs) {
    return supplierInvoiceOrOther(haystack, true);
  }
  if (looksLikeInvoice && (foreignPayee || /^faktura[\s._-]/i.test(fileName))) {
    return supplierInvoiceOrOther(haystack, foreignPayee);
  }

  if (/kvitto|kassakvitto/.test(haystack)) return { kind: "kvitto", sure: true };
  return { kind: "kvitto", sure: false };
}

/** En faktura som inte hör hemma i leverantörsreskontran sparas som övrigt underlag. */
function supplierInvoiceOrOther(haystack: string, sure: boolean): DocumentGuess {
  if (skipsSupplierLedger(haystack)) return { kind: "ovrigt", sure: true };
  return { kind: "leverantorsfaktura", sure };
}
