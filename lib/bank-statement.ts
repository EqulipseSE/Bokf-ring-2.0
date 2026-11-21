import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, bankAccounts, bankTransactions } from "@/lib/db/schema";
import { bookAccountForOpeningBalance } from "@/lib/bank-account";
import { fetchAccountNumber } from "@/lib/enable-banking";

export type BankAccountOption = {
  uid: string;
  accountNumber: string;
  bookAccountNumber: string | null;
  bookAccountName: string | null;
};

export type BankStatementRow = {
  id: string;
  date: string;
  description: string;
  reference: string;
  outOre: number;
  inOre: number;
  balanceOre: number;
  voucherId: string | null;
};

function paymentText(description: string): string {
  const trimmed = description.trim();
  const midpoint = Math.floor(trimmed.length / 2);
  const first = trimmed.slice(0, midpoint).trim();
  if (first && trimmed === `${first} ${first}`) return first;
  return trimmed;
}

/** Konton som har transaktioner. Numret hämtas från banken första gången. */
export async function listBankAccounts(companyId: string): Promise<BankAccountOption[]> {
  const used = await db
    .selectDistinct({ uid: bankTransactions.accountUid })
    .from(bankTransactions)
    .where(eq(bankTransactions.companyId, companyId));
  const stored = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.companyId, companyId));
  const storedByUid = new Map(stored.map((row) => [row.accountUid, row]));
  const chart = await db
    .select({ number: accounts.number, name: accounts.name })
    .from(accounts)
    .where(eq(accounts.companyId, companyId));
  const names = new Map(chart.map((row) => [row.number, row.name]));
  const options: BankAccountOption[] = [];
  for (const row of used) {
    const saved = storedByUid.get(row.uid);
    let accountNumber = saved?.accountNumber ?? null;
    if (!accountNumber) {
      accountNumber = await fetchAccountNumber(row.uid).catch(() => null);
      if (accountNumber) {
        await db
          .insert(bankAccounts)
          .values({ companyId, accountUid: row.uid, accountNumber })
          .onConflictDoNothing();
      }
    }
    let bookAccountNumber = saved?.bookAccountNumber ?? null;
    if (!bookAccountNumber) {
      // Kontoutdraget börjar på 0 när banken inte skickar ett ingående saldo.
      bookAccountNumber = bookAccountForOpeningBalance(0);
      if (bookAccountNumber && accountNumber) {
        await db
          .update(bankAccounts)
          .set({ bookAccountNumber })
          .where(
            and(eq(bankAccounts.companyId, companyId), eq(bankAccounts.accountUid, row.uid))
          );
      }
    }
    options.push({
      uid: row.uid,
      accountNumber: accountNumber ?? "Konto",
      bookAccountNumber,
      bookAccountName: bookAccountNumber ? (names.get(bookAccountNumber) ?? null) : null,
    });
  }
  return options.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber, "sv"));
}

/** Kontoutdrag med löpande saldo, nyast överst. */
export async function listBankStatement(
  companyId: string,
  accountUid?: string
): Promise<BankStatementRow[]> {
  const rows = await db
    .select({
      id: bankTransactions.id,
      date: bankTransactions.bookedDate,
      description: bankTransactions.description,
      referenceNumber: bankTransactions.referenceNumber,
      amountOre: bankTransactions.amountOre,
      voucherId: bankTransactions.voucherId,
    })
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.companyId, companyId),
        accountUid ? eq(bankTransactions.accountUid, accountUid) : undefined
      )
    )
    .orderBy(asc(bankTransactions.bookedDate), asc(bankTransactions.entryReference));

  let balance = 0;
  const withBalance = rows.map((row) => {
    balance += row.amountOre;
    return {
      id: row.id,
      date: row.date,
      description: paymentText(row.description) || "Transaktion",
      reference: row.referenceNumber ?? "",
      outOre: row.amountOre < 0 ? -row.amountOre : 0,
      inOre: row.amountOre > 0 ? row.amountOre : 0,
      balanceOre: balance,
      voucherId: row.voucherId,
    };
  });
  return withBalance.reverse();
}
