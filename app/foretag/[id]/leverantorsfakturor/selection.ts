"use client";

import { useSyncExternalStore } from "react";

export type SelectedSupplierInvoice = {
  id: string;
  status: string;
  /** Bokförd i L-serien. */
  bookedInL: boolean;
};

let selected: SelectedSupplierInvoice[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function setSupplierInvoiceSelection(next: SelectedSupplierInvoice[]) {
  selected = next;
  emit();
}

export function useSupplierInvoiceSelection(): SelectedSupplierInvoice[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => selected,
    () => selected
  );
}
