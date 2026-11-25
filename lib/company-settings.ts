export const VAT_PERIODS = ["manad", "kvartal", "ar"] as const;
export type CompanyVatPeriod = (typeof VAT_PERIODS)[number];

export const ACCOUNTING_METHODS = ["faktura", "kontant"] as const;
export type AccountingMethod = (typeof ACCOUNTING_METHODS)[number];

export const LEGAL_FORMS = ["ab", "ef", "hb"] as const;
export type LegalForm = (typeof LEGAL_FORMS)[number];

export const VAT_PERIOD_LABELS: Record<CompanyVatPeriod, string> = {
  manad: "Månad",
  kvartal: "Kvartal",
  ar: "Helår",
};

export const ACCOUNTING_METHOD_LABELS: Record<AccountingMethod, string> = {
  faktura: "Fakturametoden",
  kontant: "Kontantmetoden",
};

export const LEGAL_FORM_LABELS: Record<LegalForm, string> = {
  ab: "Aktiebolag",
  ef: "Enskild firma",
  hb: "Handelsbolag",
};

export function parseVatPeriodKind(
  value: unknown
): { ok: true; value: CompanyVatPeriod } | { ok: false; error: string } {
  const raw = String(value ?? "").trim();
  if (VAT_PERIODS.includes(raw as CompanyVatPeriod)) {
    return { ok: true, value: raw as CompanyVatPeriod };
  }
  return { ok: false, error: "Välj momsperiod: månad, kvartal eller helår." };
}

export function parseAccountingMethod(
  value: unknown
): { ok: true; value: AccountingMethod } | { ok: false; error: string } {
  const raw = String(value ?? "").trim();
  if (ACCOUNTING_METHODS.includes(raw as AccountingMethod)) {
    return { ok: true, value: raw as AccountingMethod };
  }
  return {
    ok: false,
    error: "Välj redovisningsmetod: fakturametoden eller kontantmetoden.",
  };
}

export function parseLegalForm(
  value: unknown
): { ok: true; value: LegalForm } | { ok: false; error: string } {
  const raw = String(value ?? "").trim();
  if (LEGAL_FORMS.includes(raw as LegalForm)) {
    return { ok: true, value: raw as LegalForm };
  }
  return {
    ok: false,
    error: "Välj bolagsform: aktiebolag, enskild firma eller handelsbolag.",
  };
}

export function vatPeriodLabel(value: string | null | undefined): string {
  const parsed = parseVatPeriodKind(value ?? "manad");
  return parsed.ok ? VAT_PERIOD_LABELS[parsed.value] : VAT_PERIOD_LABELS.manad;
}

export function accountingMethodLabel(value: string | null | undefined): string {
  const parsed = parseAccountingMethod(value ?? "faktura");
  return parsed.ok
    ? ACCOUNTING_METHOD_LABELS[parsed.value]
    : ACCOUNTING_METHOD_LABELS.faktura;
}

export function legalFormLabel(value: string | null | undefined): string {
  const parsed = parseLegalForm(value ?? "ab");
  return parsed.ok ? LEGAL_FORM_LABELS[parsed.value] : LEGAL_FORM_LABELS.ab;
}
