export const DOCUMENT_KINDS = [
  "kundfaktura",
  "leverantorsfaktura",
  "kvitto",
  "lon",
  "ovrigt",
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export type CompanyDocumentRow = {
  id: string;
  kind: DocumentKind;
  originalName: string;
  mimeType: string;
  createdAt: Date;
  linked: boolean;
};

export function isDocumentKind(value: string): value is DocumentKind {
  return (DOCUMENT_KINDS as readonly string[]).includes(value);
}

export function documentKindLabel(kind: DocumentKind): string {
  if (kind === "kundfaktura") return "Kundfaktura";
  if (kind === "leverantorsfaktura") return "Leverantörsfaktura";
  if (kind === "lon") return "Löner";
  if (kind === "ovrigt") return "Övrigt";
  return "Kvitto";
}

export function documentKindHref(companyId: string, kind: DocumentKind): string {
  if (kind === "kundfaktura") return `/foretag/${companyId}/underlag/kundfakturor`;
  if (kind === "leverantorsfaktura") {
    return `/foretag/${companyId}/underlag/leverantorsfakturor`;
  }
  if (kind === "lon") return `/foretag/${companyId}/underlag/loner`;
  if (kind === "ovrigt") return `/foretag/${companyId}/underlag/ovriga`;
  return `/foretag/${companyId}/underlag/kvitton`;
}
