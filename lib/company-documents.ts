import "server-only";

import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { and, desc, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { companyDocuments } from "@/lib/db/schema";
import {
  isDocumentKind,
  type CompanyDocumentRow,
  type DocumentKind,
} from "@/lib/document-kind";
import {
  detectUnderlagMime,
  UNDERLAG_MAX_BYTES,
  validateUnderlagMeta,
} from "@/lib/underlag";
import type { DocumentIdentity, StoredDocumentIdentity } from "@/lib/document-duplicate";

const ROOT = path.resolve(process.cwd(), "data", "underlag");
const DELETED_KEEP_MS = 48 * 60 * 60 * 1000;

export async function listCompanyDocuments(
  companyId: string,
  kind: DocumentKind
): Promise<CompanyDocumentRow[]> {
  await purgeExpiredDocuments();
  const rows = await db
    .select({
      id: companyDocuments.id,
      kind: companyDocuments.kind,
      originalName: companyDocuments.originalName,
      mimeType: companyDocuments.mimeType,
      createdAt: companyDocuments.createdAt,
      voucherId: companyDocuments.voucherId,
    })
    .from(companyDocuments)
    .where(
      and(
        eq(companyDocuments.companyId, companyId),
        eq(companyDocuments.kind, kind),
        isNull(companyDocuments.deletedAt)
      )
    )
    .orderBy(desc(companyDocuments.createdAt));
  return rows.flatMap((row) =>
    isDocumentKind(row.kind)
      ? [
          {
            id: row.id,
            kind: row.kind,
            originalName: row.originalName,
            mimeType: row.mimeType,
            createdAt: row.createdAt,
            linked: row.voucherId !== null,
          },
        ]
      : []
  );
}

export async function listDocumentIdentities(
  companyId: string
): Promise<StoredDocumentIdentity[]> {
  const rows = await db
    .select({
      contentHash: companyDocuments.contentHash,
      ocrNumber: companyDocuments.ocrNumber,
      invoiceNumber: companyDocuments.invoiceNumber,
      totalOre: companyDocuments.totalOre,
    })
    .from(companyDocuments)
    .where(and(eq(companyDocuments.companyId, companyId), isNull(companyDocuments.deletedAt)));
  return rows;
}

export async function saveCompanyDocumentFile(
  companyId: string,
  kind: DocumentKind,
  file: File,
  identity?: DocumentIdentity
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const metaError = validateUnderlagMeta(file.size, file.name, file.type);
  if (metaError) return { ok: false, error: metaError };

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > UNDERLAG_MAX_BYTES) {
    return { ok: false, error: "Underlaget får vara högst 8 MB." };
  }
  const mimeType = detectUnderlagMime(bytes);
  if (!mimeType) {
    return { ok: false, error: "Underlaget måste vara PDF, JPG eller PNG." };
  }

  const id = randomUUID();
  const ext = mimeType === "application/pdf" ? ".pdf" : mimeType === "image/png" ? ".png" : ".jpg";
  const relativePath = path.posix.join(companyId, "dokument", `${id}${ext}`);
  const absoluteDir = path.join(ROOT, companyId, "dokument");
  const absolutePath = path.join(absoluteDir, `${id}${ext}`);
  if (!absolutePath.startsWith(ROOT + path.sep)) {
    return { ok: false, error: "Kunde inte spara underlaget." };
  }

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, bytes);
  await db.insert(companyDocuments).values({
    id,
    companyId,
    kind,
    originalName: file.name || `underlag${ext}`,
    mimeType,
    sizeBytes: bytes.byteLength,
    storagePath: relativePath,
    contentHash: identity?.contentHash,
    ocrNumber: identity?.ocrNumber,
    invoiceNumber: identity?.invoiceNumber,
    totalOre: identity?.totalOre,
  });
  return { ok: true, id };
}

export async function updateCompanyDocumentKind(
  companyId: string,
  documentId: string,
  kind: DocumentKind
): Promise<boolean> {
  const updated = await db
    .update(companyDocuments)
    .set({ kind })
    .where(and(eq(companyDocuments.companyId, companyId), eq(companyDocuments.id, documentId)))
    .returning({ id: companyDocuments.id });
  return updated.length > 0;
}

export async function listDeletedDocuments(companyId: string): Promise<CompanyDocumentRow[]> {
  await purgeExpiredDocuments();
  const rows = await db
    .select({
      id: companyDocuments.id,
      kind: companyDocuments.kind,
      originalName: companyDocuments.originalName,
      mimeType: companyDocuments.mimeType,
      createdAt: companyDocuments.deletedAt,
      voucherId: companyDocuments.voucherId,
    })
    .from(companyDocuments)
    .where(and(eq(companyDocuments.companyId, companyId), isNotNull(companyDocuments.deletedAt)))
    .orderBy(desc(companyDocuments.deletedAt));
  return rows.flatMap((row) =>
    isDocumentKind(row.kind) && row.createdAt
      ? [
          {
            id: row.id,
            kind: row.kind,
            originalName: row.originalName,
            mimeType: row.mimeType,
            createdAt: row.createdAt,
            linked: row.voucherId !== null,
          },
        ]
      : []
  );
}

export async function deleteCompanyDocument(
  companyId: string,
  documentId: string
): Promise<boolean> {
  const updated = await db
    .update(companyDocuments)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(companyDocuments.companyId, companyId),
        eq(companyDocuments.id, documentId),
        isNull(companyDocuments.deletedAt)
      )
    )
    .returning({ id: companyDocuments.id });
  return updated.length > 0;
}

async function purgeExpiredDocuments(): Promise<void> {
  const cutoff = new Date(Date.now() - DELETED_KEEP_MS);
  const expired = await db
    .delete(companyDocuments)
    .where(and(isNotNull(companyDocuments.deletedAt), lt(companyDocuments.deletedAt, cutoff)))
    .returning({ storagePath: companyDocuments.storagePath });
  for (const row of expired) {
    const normalized = path.normalize(row.storagePath).replace(/^[/\\]+/, "");
    const resolved = path.resolve(ROOT, normalized);
    if (resolved.startsWith(ROOT + path.sep)) {
      await unlink(resolved).catch(() => undefined);
    }
  }
}

export async function readCompanyDocument(companyId: string, documentId: string) {
  const [row] = await db
    .select()
    .from(companyDocuments)
    .where(and(eq(companyDocuments.companyId, companyId), eq(companyDocuments.id, documentId)))
    .limit(1);
  if (!row) return null;
  const normalized = path.normalize(row.storagePath).replace(/^[/\\]+/, "");
  const resolved = path.resolve(ROOT, normalized);
  if (!resolved.startsWith(ROOT + path.sep)) return null;
  const stored = await readFile(resolved);
  return { row, stored };
}
