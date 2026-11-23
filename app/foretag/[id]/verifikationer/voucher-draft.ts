"use client";

import { isDraftDirty, type CardTarget } from "@/lib/voucher-nav";

export type { CardTarget };

export type DraftLine = {
  key: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  vatCode: string;
  resultUnit: string;
  debit: string;
  credit: string;
};

export type VoucherDraft = {
  dateInput: string;
  defaultDate: string;
  text: string;
  lines: DraftLine[];
  attachment: File | null;
  previewUrl: string | null;
};

export type Workspace = {
  draft: VoucherDraft | null;
  target: CardTarget | null;
};

const EMPTY: Workspace = { draft: null, target: null };
const workspaces = new Map<string, Workspace>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function write(companyId: string, patch: Partial<Workspace>) {
  const prev = workspaces.get(companyId) ?? EMPTY;
  workspaces.set(companyId, { ...prev, ...patch });
  emit();
}

export function subscribeVoucherWorkspace(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getWorkspace(companyId: string): Workspace {
  return workspaces.get(companyId) ?? EMPTY;
}

export function persistDraftIfDirty(companyId: string, draft: VoucherDraft) {
  if (
    !isDraftDirty({
      text: draft.text,
      dateChanged: draft.dateInput !== draft.defaultDate,
      attachment: Boolean(draft.attachment),
      lines: draft.lines,
    })
  ) {
    return;
  }
  write(companyId, { draft, target: { kind: "draft" } });
}

export function clearDraft(companyId: string) {
  write(companyId, { draft: null });
}

export function setCardTarget(companyId: string, target: CardTarget) {
  write(companyId, { target });
}
