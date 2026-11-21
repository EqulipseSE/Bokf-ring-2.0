"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { documentKindLabel, type DocumentKind } from "@/lib/document-kind";
import { UNDERLAG_ACCEPT } from "@/lib/underlag";
import { UnderlagPreview } from "../verifikationer/underlag-preview";
import { createCompanyDocuments, setDocumentKind, type UploadedDocument } from "./actions";

export function NewDocumentForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [items, setItems] = useState<UploadedDocument[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function upload(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    setPending(true);
    const formData = new FormData();
    for (const file of list) formData.append("files", file);
    const result = await createCompanyDocuments(companyId, formData);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.warning) setError(result.warning);
    setItems((current) => [...result.items, ...current]);
    if (result.items[0]) setSelectedId(result.items[0].id);
    router.refresh();
  }

  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <div className={items.length > 0 ? "grid items-start gap-6 lg:grid-cols-[24rem_1fr]" : "max-w-lg"}>
      <div>
      <div className="grid gap-3">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            void upload(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={filesRef}
          type="file"
          accept={UNDERLAG_ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => {
            void upload(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={folderRef}
          type="file"
          accept={UNDERLAG_ACCEPT}
          multiple
          className="sr-only"
          {...{ webkitdirectory: "", directory: "" }}
          onChange={(event) => {
            void upload(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => cameraRef.current?.click()}
          className="rounded-xl bg-neutral-900 px-4 py-4 text-left text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60"
        >
          Ta foto
          <span className="mt-1 block text-xs font-normal text-neutral-300">
            Öppnar kameran på telefonen
          </span>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => filesRef.current?.click()}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-4 text-left text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          Välj filer
          <span className="mt-1 block text-xs font-normal text-neutral-500">
            Flera bilder eller PDF-filer på en gång
          </span>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => folderRef.current?.click()}
          className="rounded-xl border border-neutral-300 bg-white px-4 py-4 text-left text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          Välj mapp
          <span className="mt-1 block text-xs font-normal text-neutral-500">
            Hela mappen, till exempel från nedladdningar
          </span>
        </button>
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        PDF, JPG eller PNG, högst 8 MB per fil. Fakturor skiljs åt med
        organisationsnummer, bankgiro och plusgiro. Stämmer numret med företaget
        är det en kundfaktura, annars en leverantörsfaktura. Fyll i numren under
        Företagsinställningar. Du kan byta kategori om det blev fel.
      </p>
      {pending ? <p className="mt-3 text-sm text-neutral-600">Läser och sorterar…</p> : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {items.length > 0 ? (
        <ul className="mt-6 divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
          {items.map((item) => (
            <li key={item.id} className={item.id === selected?.id ? "bg-neutral-50" : ""}>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm font-medium text-neutral-900">{item.name}</p>
                <p className="text-xs text-neutral-500">
                  {item.sure ? "Sorterad som" : "Osäker, gissade"} {item.label.toLowerCase()}
                </p>
              </button>
              <KindSelect
                companyId={companyId}
                documentId={item.id}
                kind={item.kind}
                onChanged={(kind) =>
                  setItems((current) =>
                    current.map((row) =>
                      row.id === item.id
                        ? { ...row, kind, label: documentKindLabel(kind), sure: true }
                        : row
                    )
                  )
                }
              />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      </div>
      {selected ? (
        <div className="sticky top-6 mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-white [container-type:inline-size] lg:mt-0">
          <p className="truncate border-b border-neutral-200 px-3 py-2 text-xs text-neutral-500">
            {selected.name}
          </p>
          <UnderlagPreview
            src={`/foretag/${companyId}/underlag/fil/${selected.id}`}
            mimeType={selected.mimeType}
            fileName={selected.name}
            fullPage
          />
        </div>
      ) : null}
    </div>
  );
}

export function KindSelect({
  companyId,
  documentId,
  kind,
  onChanged,
}: {
  companyId: string;
  documentId: string;
  kind: DocumentKind;
  onChanged?: (kind: DocumentKind) => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(kind);
  const [pending, setPending] = useState(false);

  return (
    <select
      aria-label="Kategori"
      value={value}
      disabled={pending}
      onChange={async (event) => {
        const next = event.target.value;
        if (!next) return;
        setPending(true);
        const result = await setDocumentKind(companyId, documentId, next);
        setPending(false);
        if (!result.ok) return;
        setValue(next as DocumentKind);
        onChanged?.(next as DocumentKind);
        router.refresh();
      }}
      className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm text-neutral-900"
    >
      <option value="kvitto">Kvitto</option>
      <option value="lon">Löner</option>
      <option value="ovrigt">Övrigt</option>
      <option value="kundfaktura">Kundfaktura</option>
      <option value="leverantorsfaktura">Leverantörsfaktura</option>
    </select>
  );
}
