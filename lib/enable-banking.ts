import "server-only";

import { createSign } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const API = "https://api.enablebanking.com";

export function enableBankingConfig():
  | { ok: true; appId: string; keyPath: string }
  | { ok: false; error: string } {
  const appId = process.env.ENABLE_BANKING_APP_ID?.trim();
  const keyPath = process.env.ENABLE_BANKING_KEY_PATH?.trim();
  if (!appId || !keyPath) {
    return { ok: false, error: "Enable Banking saknar app-id eller nyckelsökväg i .env." };
  }
  return { ok: true, appId, keyPath };
}

async function privateKey(): Promise<string> {
  const config = enableBankingConfig();
  if (!config.ok) throw new Error(config.error);
  return readFile(config.keyPath, "utf8");
}

function signJwt(pem: string, appId: string): string {
  const header = Buffer.from(
    JSON.stringify({ typ: "JWT", alg: "RS256", kid: appId })
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({
      iss: "enablebanking.com",
      aud: "api.enablebanking.com",
      iat: now,
      exp: now + 60 * 60,
    })
  ).toString("base64url");
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${body}`);
  signer.end();
  const signature = signer.sign(pem).toString("base64url");
  return `${header}.${body}.${signature}`;
}

async function authHeader(): Promise<string> {
  const config = enableBankingConfig();
  if (!config.ok) throw new Error(config.error);
  const pem = await privateKey();
  return `Bearer ${signJwt(pem, config.appId)}`;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: await authHeader(),
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const text = await response.text();
  const json = text ? (JSON.parse(text) as T & { message?: string; error?: string }) : ({} as T);
  if (!response.ok) {
    const detail =
      typeof json === "object" && json && "message" in json && json.message
        ? String(json.message)
        : `Enable Banking svarade ${response.status}.`;
    throw new Error(detail);
  }
  return json;
}

type Aspsp = { name: string; country: string };

export async function pickSandboxAspsp(): Promise<Aspsp> {
  const listed = await api<{ aspsps?: Aspsp[] }>("/aspsps");
  const banks = listed.aspsps ?? [];
  const mock = banks.find((bank) => /mock|sandbox/i.test(bank.name));
  const swedish = banks.find((bank) => bank.country === "SE");
  const chosen = mock ?? swedish ?? banks[0];
  if (!chosen) throw new Error("Enable Banking gav ingen bank att koppla.");
  return { name: chosen.name, country: chosen.country };
}

export async function startAuthorization(input: {
  aspsp: Aspsp;
  state: string;
  redirectUrl: string;
  validUntil: string;
}): Promise<string> {
  const result = await api<{ url: string }>("/auth", {
    method: "POST",
    body: JSON.stringify({
      access: { valid_until: input.validUntil },
      aspsp: input.aspsp,
      state: input.state,
      redirect_url: input.redirectUrl,
      psu_type: "business",
      language: "sv",
    }),
  });
  return result.url;
}

export type BankSessionAccount = { uid: string };

export async function authorizeSession(code: string): Promise<{
  sessionId: string;
  accountUids: string[];
  aspsp: Aspsp;
  validUntil: string;
}> {
  const result = await api<{
    session_id: string;
    accounts: BankSessionAccount[];
    aspsp: Aspsp;
    access: { valid_until: string };
  }>("/sessions", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return {
    sessionId: result.session_id,
    accountUids: result.accounts.map((account) => account.uid).filter(Boolean),
    aspsp: result.aspsp,
    validUntil: result.access.valid_until,
  };
}

export type FetchedBankTransaction = {
  entryReference: string;
  bookedDate: string;
  amountOre: number;
  currency: string;
  description: string;
  referenceNumber: string | null;
};

type BankAccountDetails = {
  account_id?: {
    iban?: string | null;
    other?: { identification?: string | null; scheme_name?: string | null } | null;
  } | null;
  all_account_ids?: Array<{
    scheme_name?: string | null;
    identification?: string | null;
  }> | null;
  name?: string | null;
  details?: string | null;
  product?: string | null;
};

export async function fetchAccountNumber(accountUid: string): Promise<string | null> {
  const account = await api<BankAccountDetails>(`/accounts/${accountUid}`);
  return accountNumberFrom(account);
}

function accountNumberFrom(account: BankAccountDetails): string | null {
  const listed = account.all_account_ids ?? [];
  const bban = listed.find((item) => item.scheme_name === "BBAN" && item.identification)?.identification;
  const iban = listed.find((item) => item.scheme_name === "IBAN" && item.identification)?.identification;
  const number =
    bban?.trim() ||
    account.account_id?.other?.identification?.trim() ||
    iban?.trim() ||
    account.account_id?.iban?.trim() ||
    null;
  return number;
}

export async function fetchAccountTransactions(
  accountUid: string
): Promise<FetchedBankTransaction[]> {
  const collected: FetchedBankTransaction[] = [];
  let continuation: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const query = continuation
      ? `?continuation_key=${encodeURIComponent(continuation)}`
      : "";
    const result = await api<{
      transactions?: RawTransaction[];
      continuation_key?: string | null;
    }>(`/accounts/${accountUid}/transactions${query}`);
    for (const [index, transaction] of (result.transactions ?? []).entries()) {
      const mapped = mapTransaction(transaction, index);
      if (mapped) collected.push(mapped);
    }
    if (!result.continuation_key) break;
    continuation = result.continuation_key;
  }
  return collected;
}

type RawTransaction = {
  entry_reference?: string | null;
  transaction_amount?: { amount?: string; currency?: string };
  credit_debit_indicator?: string;
  booking_date?: string | null;
  value_date?: string | null;
  remittance_information?: string[] | null;
  reference_number?: string | null;
  creditor?: { name?: string | null } | null;
  debtor?: { name?: string | null } | null;
};

function mapTransaction(transaction: RawTransaction, index: number): FetchedBankTransaction | null {
  const amount = transaction.transaction_amount?.amount;
  const currency = transaction.transaction_amount?.currency;
  const date = transaction.booking_date || transaction.value_date;
  if (!amount || !currency || !date) return null;
  const ore = Math.round(Number(amount) * 100);
  if (!Number.isFinite(ore)) return null;
  const signed = transaction.credit_debit_indicator === "DBIT" ? -Math.abs(ore) : Math.abs(ore);
  const remittance = (transaction.remittance_information ?? []).filter(
    (part): part is string => Boolean(part)
  );
  const names = [transaction.creditor?.name, transaction.debtor?.name].filter(
    (name): name is string => Boolean(name) && !remittance.includes(name)
  );
  const description = [...remittance, ...names].join(" ").trim();
  return {
    entryReference: transaction.entry_reference || `${date}-${signed}-${index}`,
    bookedDate: date,
    amountOre: signed,
    currency,
    description,
    referenceNumber: transaction.reference_number ?? null,
  };
}

export function keyFileExists(keyPath: string): boolean {
  return existsSync(keyPath);
}
