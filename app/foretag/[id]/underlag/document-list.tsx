"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  DOCUMENT_KINDS,
  documentKindLabel,
  type CompanyDocumentRow,
  type DocumentKind,
} from "@/lib/document-kind";
import { removeCompanyDocument, setDocumentKind } from "./actions";

export function DocumentList({
  companyId,
  rows,
  empty,
  archived = false,
}: {
  companyId: string;
  rows: CompanyDocumentRow[];
  empty: string;
  archived?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
        <p className="font-medium text-neutral-900">{empty}</p>
        <Link
          href={`/foretag/${companyId}/underlag/nytt`}
          className="mt-6 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Nytt underlag
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
            <th className="px-4 py-3.5 font-medium">Datum</th>
            <th className="px-4 py-3.5 font-medium">Fil</th>
            <th className="px-4 py-3.5 font-medium">Status</th>
            <th className="px-4 py-3.5 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-neutral-50">
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-neutral-500">
                {row.createdAt.toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" })}
              </td>
              <td className="px-4 py-3 text-neutral-900">{row.originalName}</td>
              <td className="px-4 py-3">
                <span
                  aria-label={row.linked ? "Kopplat till verifikation" : "Ej kopplat"}
                  className={`inline-block size-2.5 rounded-full ${
                    row.linked ? "bg-emerald-500" : "bg-neutral-300"
                  }`}
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <IconButton label="Visa" href={`/foretag/${companyId}/underlag/fil/${row.id}`}>
                    <PaperIcon />
                  </IconButton>
                  {archived ? null : (
                    <>
                      <CategoryButton companyId={companyId} documentId={row.id} kind={row.kind} />
                      <DeleteButton companyId={companyId} documentId={row.id} />
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IconButton({
  label,
  href,
  onClick,
  children,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const className =
    "flex size-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200 hover:text-neutral-950";
  const tip = (
    <span
      role="tooltip"
      className="pointer-events-none absolute top-full left-1/2 z-30 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
    >
      {label}
    </span>
  );
  if (href) {
    return (
      <span className="group relative">
        <Link href={href} aria-label={label} className={className}>
          {children}
        </Link>
        {tip}
      </span>
    );
  }
  return (
    <span className="group relative">
      <button type="button" aria-label={label} onClick={onClick} className={className}>
        {children}
      </button>
      {tip}
    </span>
  );
}

function CategoryButton({
  companyId,
  documentId,
  kind,
}: {
  companyId: string;
  documentId: string;
  kind: DocumentKind;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <span ref={rootRef} className="relative">
      <IconButton label="Ändra kategori" onClick={() => setOpen((value) => !value)}>
        <PencilIcon />
      </IconButton>
      {open ? (
        <span className="absolute top-full right-0 z-40 mt-1 w-44 rounded-md border border-neutral-200 bg-white py-1 shadow-md">
          {DOCUMENT_KINDS.map((option) => (
            <button
              key={option}
              type="button"
              className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-100 ${
                option === kind ? "font-medium text-neutral-900" : "text-neutral-700"
              }`}
              onClick={async () => {
                setOpen(false);
                if (option === kind) return;
                const result = await setDocumentKind(companyId, documentId, option);
                if (result.ok) router.refresh();
              }}
            >
              {documentKindLabel(option)}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}

function DeleteButton({
  companyId,
  documentId,
}: {
  companyId: string;
  documentId: string;
}) {
  const router = useRouter();
  return (
    <IconButton
      label="Ta bort"
      onClick={async () => {
        const result = await removeCompanyDocument(companyId, documentId);
        if (result.ok) router.refresh();
      }}
    >
      <TrashIcon />
    </IconButton>
  );
}

function PaperIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4" aria-hidden>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4" aria-hidden>
      <path d="M4 20h4l11-11-4-4L4 16v4Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m13 7 4 4" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-4" aria-hidden>
      <path d="M5 7h14" strokeLinecap="round" />
      <path d="M9 7V5h6v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7l1 13h6l1-13" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
