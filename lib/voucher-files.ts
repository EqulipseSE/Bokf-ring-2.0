import "server-only";

import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { voucherAttachments, vouchers } from "@/lib/db/schema";
import { assertDateOpen } from "@/lib/period-lock";
import { getLockedThrough } from "@/lib/period-lock-query";
import {
  detectUnderlagMime,
  UNDERLAG_MAX_BYTES,
  validateUnderlagMeta,
  type UnderlagMime,
} from "@/lib/underlag";

const ROOT = path.resolve(process.cwd(), "data", "underlag");

export type StoredUnderlag = {
  originalName: string;
  mimeType: UnderlagMime;
  sizeBytes: number;
  storagePath: string;
};

export async function persistVoucherUnderlag(
  companyId: string,
  voucherId: string,
  file: File
): Promise<{ ok: true; stored: StoredUnderlag } | { ok: false; error: string }> {
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

  const [voucher] = await db
    .select({
      id: vouchers.id,
      companyId: vouchers.companyId,
      date: vouchers.date,
    })
    .from(vouchers)
    .where(eq(vouchers.id, voucherId))
    .limit(1);
  if (!voucher || voucher.companyId !== companyId) {
    return { ok: false, error: "Verifikationen finns inte." };
  }
  const lockedThrough = await getLockedThrough(companyId);
  const periodCheck = assertDateOpen(voucher.date, lockedThrough);
  if (!periodCheck.ok) return periodCheck;

  const [existing] = await db
    .select()
    .from(voucherAttachments)
    .where(eq(voucherAttachments.voucherId, voucherId))
    .limit(1);

  const fileName = safeFileName(file.name, mimeType);
  const relativePath = path.posix.join(companyId, voucherId, fileName);
  const absoluteDir = path.join(ROOT, companyId, voucherId);
  const absolutePath = path.join(absoluteDir, fileName);
  if (!absolutePath.startsWith(ROOT + path.sep)) {
    return { ok: false, error: "Kunde inte spara underlaget." };
  }

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, bytes);

  const stored: StoredUnderlag = {
    originalName: file.name || fileName,
    mimeType,
    sizeBytes: bytes.byteLength,
    storagePath: relativePath,
  };

  if (existing) {
    if (existing.storagePath !== relativePath) {
      await removeStoredFile(existing.storagePath);
    }
    await db
      .update(voucherAttachments)
      .set({
        originalName: stored.originalName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        storagePath: stored.storagePath,
      })
      .where(eq(voucherAttachments.id, existing.id));
  } else {
    await db.insert(voucherAttachments).values({
      voucherId,
      originalName: stored.originalName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      storagePath: stored.storagePath,
    });
  }

  return { ok: true, stored };
}

export async function readStoredUnderlag(
  storagePath: string
): Promise<Buffer> {
  const resolved = resolveStoragePath(storagePath);
  return readFile(resolved);
}

export async function getVoucherAttachmentRow(voucherId: string) {
  const [row] = await db
    .select()
    .from(voucherAttachments)
    .where(eq(voucherAttachments.voucherId, voucherId))
    .limit(1);
  return row ?? null;
}

function resolveStoragePath(storagePath: string): string {
  const normalized = path.normalize(storagePath).replace(/^[/\\]+/, "");
  const resolved = path.resolve(ROOT, normalized);
  if (!resolved.startsWith(ROOT + path.sep)) {
    throw new Error("PATH");
  }
  return resolved;
}

export async function removeStoredUnderlag(storagePath: string): Promise<void> {
  await removeStoredFile(storagePath);
}

async function removeStoredFile(storagePath: string): Promise<void> {
  try {
    await unlink(resolveStoragePath(storagePath));
  } catch {
    // Gammal fil kan redan vara borta.
  }
}

function safeFileName(original: string, mime: UnderlagMime): string {
  const ext =
    mime === "application/pdf" ? ".pdf" : mime === "image/png" ? ".png" : ".jpg";
  const base = path
    .basename(original, path.extname(original))
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  return `${base || "underlag"}${ext}`;
}
