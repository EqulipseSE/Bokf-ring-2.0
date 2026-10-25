export type CardTarget =
  | { kind: "draft" }
  | { kind: "saved"; id: string }
  | { kind: "empty" };

export function verifikationerBase(companyId: string): string {
  return `/foretag/${companyId}/verifikationer`;
}

export function isOnVerifikationer(
  pathname: string,
  companyId: string
): boolean {
  const base = verifikationerBase(companyId);
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function voucherSubmenuState(
  pathname: string,
  companyId: string
): { lista: boolean; kort: boolean; ny: boolean } | null {
  if (!isOnVerifikationer(pathname, companyId)) return null;
  const base = verifikationerBase(companyId);
  const isLista = pathname === base;
  const isNy = pathname === `${base}/ny`;
  return {
    lista: isLista,
    kort: !isLista,
    ny: isNy,
  };
}

export function resolveKortHref(input: {
  companyId: string;
  hasDirtyDraft: boolean;
  target: CardTarget | null;
}): string {
  const base = verifikationerBase(input.companyId);
  if (input.hasDirtyDraft || input.target?.kind === "draft") {
    return `${base}/ny`;
  }
  if (input.target?.kind === "saved") {
    return `${base}/${input.target.id}`;
  }
  return `${base}/kort`;
}

export function isDraftDirty(draft: {
  text: string;
  dateChanged: boolean;
  attachment: boolean;
  lines: {
    accountId: string;
    accountNumber: string;
    debit: string;
    credit: string;
  }[];
}): boolean {
  if (draft.text.trim()) return true;
  if (draft.dateChanged) return true;
  if (draft.attachment) return true;
  return draft.lines.some(
    (line) =>
      Boolean(line.accountId) ||
      Boolean(line.accountNumber.trim()) ||
      Boolean(line.debit.trim()) ||
      Boolean(line.credit.trim())
  );
}
