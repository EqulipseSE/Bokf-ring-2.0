"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { ResultUnit } from "@/lib/result-units";
import {
  createResultUnit,
  deleteResultUnit,
  updateResultUnit,
} from "./result-unit-actions";

const fieldClass =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200";

type Draft = { code: string; name: string };

export function ResultUnitsPanel({
  companyId,
  rows,
}: {
  companyId: string;
  rows: ResultUnit[];
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<
    null | { mode: "create" } | { mode: "edit"; row: ResultUnit }
  >(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(row: ResultUnit) {
    setError(null);
    setBusyId(row.id);
    try {
      const result = await deleteResultUnit(companyId, row.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-900">
            Resultatenheter
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Kod och namn. Koppling till verifikationer och rapporter kommer
            senare.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditor({ mode: "create" })}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          <PlusIcon />
          Lägg till
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="border-b border-red-100 bg-red-50 px-6 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-100 text-left text-xs font-medium text-neutral-600">
            <th className="whitespace-nowrap px-6 py-2 font-medium">
              Resultatenhet
            </th>
            <th className="whitespace-nowrap px-3 py-2 font-medium">Namn</th>
            <th className="w-0 whitespace-nowrap px-6 py-2 font-medium">
              <span className="sr-only">Åtgärder</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-6 py-6 text-sm text-neutral-500">
                Inga resultatenheter ännu.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-neutral-100 last:border-b-0"
              >
                <td className="whitespace-nowrap px-6 py-2.5 font-mono text-neutral-900">
                  {row.code}
                </td>
                <td className="px-3 py-2.5 text-neutral-900">{row.name}</td>
                <td className="whitespace-nowrap px-6 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      aria-label={`Ändra ${row.code}`}
                      onClick={() => setEditor({ mode: "edit", row })}
                      className="rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      aria-label={`Ta bort ${row.code}`}
                      disabled={busyId === row.id}
                      onClick={() => remove(row)}
                      className="rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-100 hover:text-red-700 disabled:opacity-50"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {editor ? (
        <ResultUnitDialog
          title={
            editor.mode === "create"
              ? "Lägg till resultatenhet"
              : "Ändra resultatenhet"
          }
          initial={
            editor.mode === "create"
              ? { code: "", name: "" }
              : { code: editor.row.code, name: editor.row.name }
          }
          onClose={() => setEditor(null)}
          onSave={async (draft) => {
            const result =
              editor.mode === "create"
                ? await createResultUnit(companyId, draft)
                : await updateResultUnit(companyId, editor.row.id, draft);
            if (!result.ok) return result.error;
            router.refresh();
            return null;
          }}
        />
      ) : null}
    </div>
  );
}

function ResultUnitDialog({
  title,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  initial: Draft;
  onClose: () => void;
  onSave: (draft: Draft) => Promise<string | null>;
}) {
  const titleId = useId();
  const [draft, setDraft] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const message = await onSave(draft);
      if (message) {
        setError(message);
        return;
      }
      onClose();
    } catch {
      setError("Kunde inte spara.");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/30 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-lg"
      >
        <div className="border-b border-neutral-200 px-5 py-3">
          <h2 id={titleId} className="text-sm font-medium text-neutral-900">
            {title}
          </h2>
        </div>
        <div className="grid gap-3 px-5 py-4">
          <label className="grid gap-1 text-xs font-medium text-neutral-600">
            Resultatenhet
            <input
              autoFocus
              value={draft.code}
              onChange={(event) =>
                setDraft((current) => ({ ...current, code: event.target.value }))
              }
              className={`${fieldClass} font-mono`}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-neutral-600">
            Namn
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              className={fieldClass}
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
          >
            Avbryt
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60"
          >
            {saving ? "Sparar…" : "Spara"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
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
