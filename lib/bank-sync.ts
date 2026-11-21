import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { bankAccounts, bankConnections, bankLinkStates, bankTransactions } from "@/lib/db/schema";
import {
  authorizeSession,
  enableBankingConfig,
  fetchAccountNumber,
  fetchAccountTransactions,
  keyFileExists,
  pickSandboxAspsp,
  startAuthorization,
} from "@/lib/enable-banking";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function connectedCompanyIds(): Promise<Set<string>> {
  const rows = await db
    .select({ companyId: bankConnections.companyId, validUntil: bankConnections.validUntil })
    .from(bankConnections);
  const now = Date.now();
  return new Set(
    rows.filter((row) => row.validUntil.getTime() > now).map((row) => row.companyId)
  );
}

export async function beginBankLink(
  companyId: string,
  redirectUrl: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const config = enableBankingConfig();
  if (!config.ok) return config;
  if (!keyFileExists(config.keyPath)) {
    return { ok: false, error: "Nyckelfilen för Enable Banking saknas." };
  }
  try {
    const aspsp = await pickSandboxAspsp();
    const state = randomUUID();
    const validUntil = new Date(Date.now() + 89 * DAY_MS).toISOString();
    await db.insert(bankLinkStates).values({ state, companyId });
    const url = await startAuthorization({ aspsp, state, redirectUrl, validUntil });
    return { ok: true, url };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kunde inte starta bankkopplingen.";
    if (/redirect/i.test(message)) {
      return {
        ok: false,
        error: `Vitlista den här adressen i Enable Banking-appen: ${redirectUrl}`,
      };
    }
    return { ok: false, error: message };
  }
}

export async function completeBankLink(
  code: string,
  state: string
): Promise<{ ok: true; companyId: string } | { ok: false; error: string }> {
  const [pending] = await db
    .select()
    .from(bankLinkStates)
    .where(eq(bankLinkStates.state, state))
    .limit(1);
  if (!pending) return { ok: false, error: "Bankkopplingen kunde inte kopplas till ett bolag." };
  try {
    const session = await authorizeSession(code);
    await db
      .insert(bankConnections)
      .values({
        companyId: pending.companyId,
        sessionId: session.sessionId,
        aspspName: session.aspsp.name,
        aspspCountry: session.aspsp.country,
        accountUids: session.accountUids.join(","),
        validUntil: new Date(session.validUntil),
        lastFetchedAt: null,
      })
      .onConflictDoUpdate({
        target: bankConnections.companyId,
        set: {
          sessionId: session.sessionId,
          aspspName: session.aspsp.name,
          aspspCountry: session.aspsp.country,
          accountUids: session.accountUids.join(","),
          validUntil: new Date(session.validUntil),
          lastFetchedAt: null,
        },
      });
    await db.delete(bankLinkStates).where(eq(bankLinkStates.state, state));
    await fetchStoredTransactions(pending.companyId);
    return { ok: true, companyId: pending.companyId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Banken godkände inte kopplingen.";
    return { ok: false, error: message };
  }
}

export async function refreshStaleBankConnections(): Promise<void> {
  const cutoff = new Date(Date.now() - DAY_MS);
  const stale = await db
    .select({ companyId: bankConnections.companyId })
    .from(bankConnections)
    .where(
      and(
        sql`${bankConnections.validUntil} > now()`,
        sql`(${bankConnections.lastFetchedAt} is null or ${bankConnections.lastFetchedAt} < ${cutoff})`
      )
    );
  for (const row of stale) {
    try {
      await fetchStoredTransactions(row.companyId);
    } catch {
      // Nästa besök på klientlistan försöker igen.
    }
  }
}

async function fetchStoredTransactions(companyId: string): Promise<void> {
  const [connection] = await db
    .select()
    .from(bankConnections)
    .where(eq(bankConnections.companyId, companyId))
    .limit(1);
  if (!connection) return;
  const uids = connection.accountUids.split(",").map((uid) => uid.trim()).filter(Boolean);
  for (const uid of uids) {
    const accountNumber = await fetchAccountNumber(uid).catch(() => null);
    if (accountNumber) {
      await db
        .insert(bankAccounts)
        .values({ companyId, accountUid: uid, accountNumber })
        .onConflictDoUpdate({
          target: [bankAccounts.companyId, bankAccounts.accountUid],
          set: { accountNumber },
        });
    }
    const transactions = await fetchAccountTransactions(uid);
    for (const transaction of transactions) {
      await db
        .insert(bankTransactions)
        .values({
          companyId,
          accountUid: uid,
          entryReference: transaction.entryReference,
          bookedDate: transaction.bookedDate,
          amountOre: transaction.amountOre,
          currency: transaction.currency,
          description: transaction.description,
          referenceNumber: transaction.referenceNumber,
        })
        .onConflictDoNothing();
    }
  }
  await db
    .update(bankConnections)
    .set({ lastFetchedAt: new Date() })
    .where(eq(bankConnections.companyId, companyId));
}