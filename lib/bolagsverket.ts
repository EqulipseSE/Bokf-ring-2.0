import type { LegalForm } from "@/lib/company-settings";

const TEST_TOKEN_URL = "https://portal-accept2.api.bolagsverket.se/oauth2/token";
const PROD_TOKEN_URL = "https://portal.api.bolagsverket.se/oauth2/token";
const TEST_ORG_URL =
  "https://gw-accept2.api.bolagsverket.se/vardefulla-datamangder/v1/organisationer";
const PROD_ORG_URL =
  "https://gw.api.bolagsverket.se/vardefulla-datamangder/v1/organisationer";

export type CompanyLookup = {
  name: string;
  legalForm: LegalForm | null;
  legalFormLabel: string;
};

type TokenResponse = { access_token?: string };

let cachedToken: { value: string; expiresAt: number } | null = null;

function useProduction(): boolean {
  return process.env.BOLAGSVERKET_ENV === "production";
}

export function organisationDigits(orgNumber: string): string {
  return orgNumber.replace(/\D/g, "");
}

export function legalFormFromBolagsverket(
  code: string | undefined,
  label: string | undefined
): LegalForm | null {
  const normalized = `${code ?? ""} ${label ?? ""}`.toLocaleLowerCase("sv");
  if (normalized.includes("enskild")) return "ef";
  if (code?.toUpperCase() === "AB" || normalized.includes("aktiebolag")) return "ab";
  return null;
}

export function companyFromBolagsverket(payload: unknown): CompanyLookup | { error: string } {
  const organisation = (
    payload as { organisationer?: unknown[] } | null
  )?.organisationer?.[0] as
    | {
        organisationsnamn?: {
          organisationsnamnLista?: { namn?: string; organisationsnamntyp?: { kod?: string } }[];
        };
        organisationsform?: { kod?: string; klartext?: string };
      }
    | undefined;

  if (!organisation) {
    return { error: "Bolagsverket hittade inget företag med det organisationsnumret." };
  }

  const names = organisation.organisationsnamn?.organisationsnamnLista ?? [];
  const companyName =
    names.find((item) => item.organisationsnamntyp?.kod === "FORETAGSNAMN")?.namn ??
    names.find((item) => item.namn?.trim())?.namn;

  if (!companyName?.trim()) {
    return { error: "Bolagsverket svarade utan företagsnamn." };
  }

  const label = organisation.organisationsform?.klartext?.trim() || "Okänd bolagsform";
  return {
    name: companyName.trim(),
    legalForm: legalFormFromBolagsverket(
      organisation.organisationsform?.kod,
      organisation.organisationsform?.klartext
    ),
    legalFormLabel: label,
  };
}

async function accessToken(): Promise<string> {
  const clientId = process.env.BOLAGSVERKET_CLIENT_ID;
  const clientSecret = process.env.BOLAGSVERKET_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SAKNAR_NYCKLAR");
  }
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "vardefulla-datamangder:read",
  });
  const response = await fetch(useProduction() ? PROD_TOKEN_URL : TEST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!response.ok) throw new Error("TOKEN");
  const json = (await response.json()) as TokenResponse;
  if (!json.access_token) throw new Error("TOKEN");
  cachedToken = { value: json.access_token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return json.access_token;
}

export async function lookupOrganisation(orgNumber: string): Promise<CompanyLookup | { error: string }> {
  const identitetsbeteckning = organisationDigits(orgNumber);
  if (identitetsbeteckning.length < 10) {
    return { error: "Fyll i organisationsnumret innan du hämtar företaget." };
  }

  try {
    const token = await accessToken();
    const response = await fetch(useProduction() ? PROD_ORG_URL : TEST_ORG_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identitetsbeteckning }),
    });
    if (response.status === 404) {
      return { error: "Bolagsverket hittade inget företag med det organisationsnumret." };
    }
    if (!response.ok) {
      return { error: "Bolagsverket svarade inte. Försök igen om en stund." };
    }
    return companyFromBolagsverket(await response.json());
  } catch (err) {
    if (err instanceof Error && err.message === "SAKNAR_NYCKLAR") {
      return {
        error:
          "Bolagsverkets nycklar saknas. Lägg client_id och client_secret i .env.",
      };
    }
    return { error: "Kunde inte nå Bolagsverket." };
  }
}
