"use client";

import { useTransition } from "react";
import { startBankConnection } from "./bank-actions";

export function BankButton({
  companyId,
  linked,
}: {
  companyId: string;
  linked: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const label = linked ? "Bank-kopplad" : "Hämta kontoutdrag";

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        disabled={linked || pending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          startTransition(() => startBankConnection(companyId));
        }}
        className="flex size-8 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-default disabled:hover:bg-emerald-600"
      >
        {linked ? <CheckIcon /> : <PaperIcon />}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-1/2 right-full z-20 mr-2 -translate-y-1/2 rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium whitespace-nowrap text-white opacity-0 shadow-md group-hover:opacity-100"
      >
        {pending ? "Hämtar…" : label}
      </span>
    </span>
  );
}

function PaperIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" />
      <path d="M14 3.5V8h4.5" />
      <path d="M8.5 12.5h7M8.5 16h7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 12.5 9.5 17 19 7" />
    </svg>
  );
}
