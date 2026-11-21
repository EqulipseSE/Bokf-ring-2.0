"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getCompany } from "@/lib/company";
import {
  deleteCompanyDocument,
  listDocumentIdentities,
  saveCompanyDocumentFile,
  updateCompanyDocumentKind,
} from "@/lib/company-documents";
import { duplicateDocumentMessage, readDocumentIdentity } from "@/lib/document-duplicate";
import {
  documentKindHref,
  documentKindLabel,
  isDocumentKind,
  type DocumentKind,
} from "@/lib/document-kind";
import { textFromImage, textFromPdfPage } from "@/lib/document-ocr";
import { guessDocumentKind, textFromPdfBytes } from "@/lib/document-sort";

export type UploadedDocument = {
  id: string;
  name: string;
  kind: DocumentKind;
  label: string;
  sure: boolean;
  mimeType: string;
};

function refreshDocumentLists(companyId: string) {
  revalidatePath(`/foretag/${companyId}/underlag/nytt`);
  revalidatePath(`/foretag/${companyId}/underlag/kundfakturor`);
  revalidatePath(`/foretag/${companyId}/underlag/leverantorsfakturor`);
  revalidatePath(`/foretag/${companyId}/underlag/kvitton`);
  revalidatePath(`/foretag/${companyId}/underlag/loner`);
  revalidatePath(`/foretag/${companyId}/underlag/ovriga`);
  revalidatePath(`/foretag/${companyId}/underlag/raderade`);
}

export async function createCompanyDocuments(
  companyId: string,
  formData: FormData
): Promise<
  { ok: true; items: UploadedDocument[]; warning?: string } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Du är inte inloggad." };
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };

  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) return { ok: false, error: "Välj minst en fil." };

  const items: UploadedDocument[] = [];
  const errors: string[] = [];
  const existing = await listDocumentIdentities(company.id);
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    let text = isPdf ? textFromPdfBytes(bytes) : await textFromImage(bytes);
    let guess = guessDocumentKind(file.name, text, {
      name: company.name,
      orgNumber: company.orgNumber,
      bankgiro: company.bankgiro,
      plusgiro: company.plusgiro,
    });
    if (isPdf && !guess.sure) {
      const pageText = await textFromPdfPage(bytes);
      if (pageText.trim()) {
        text = `${text}\n${pageText}`;
        guess = guessDocumentKind(file.name, text, {
          name: company.name,
          orgNumber: company.orgNumber,
          bankgiro: company.bankgiro,
          plusgiro: company.plusgiro,
        });
      }
    }
    const identity = readDocumentIdentity(
      file.name,
      text,
      createHash("sha256").update(bytes).digest("hex")
    );
    const duplicate = duplicateDocumentMessage(existing, identity);
    if (duplicate) {
      errors.push(`${file.name}: ${duplicate}`);
      continue;
    }
    const saved = await saveCompanyDocumentFile(
      company.id,
      guess.kind,
      new File([bytes], file.name, { type: file.type }),
      identity
    );
    if (!saved.ok) {
      errors.push(`${file.name}: ${saved.error}`);
      continue;
    }
    items.push({
      id: saved.id,
      name: file.name || "Underlag",
      kind: guess.kind,
      label: documentKindLabel(guess.kind),
      sure: guess.sure,
      mimeType: file.type || "application/pdf",
    });
    existing.push(identity);
  }

  if (items.length === 0) {
    return { ok: false, error: errors[0] ?? "Kunde inte spara underlaget." };
  }
  refreshDocumentLists(company.id);
  return {
    ok: true,
    items,
    warning: errors.length > 0 ? errors[0] : undefined,
  };
}

export async function setDocumentKind(
  companyId: string,
  documentId: string,
  kind: string
): Promise<{ ok: true; href: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Du är inte inloggad." };
  if (!isDocumentKind(kind)) return { ok: false, error: "Okänd kategori." };
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };
  const updated = await updateCompanyDocumentKind(company.id, documentId, kind);
  if (!updated) return { ok: false, error: "Underlaget finns inte." };
  refreshDocumentLists(company.id);
  return { ok: true, href: documentKindHref(company.id, kind) };
}

export async function removeCompanyDocument(
  companyId: string,
  documentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Du är inte inloggad." };
  const company = await getCompany(companyId);
  if (!company) return { ok: false, error: "Företaget finns inte." };
  const removed = await deleteCompanyDocument(company.id, documentId);
  if (!removed) return { ok: false, error: "Underlaget finns inte." };
  refreshDocumentLists(company.id);
  return { ok: true };
}
