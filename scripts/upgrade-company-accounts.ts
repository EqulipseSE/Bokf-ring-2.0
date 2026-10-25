/**
 * Kompletterar ett befintligt företags kontoplan med saknade BAS 2026-konton.
 * Befintliga konton (nummer, namn, momskod) lämnas orörda.
 *
 *   pnpm upgrade-accounts 556036-0793
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { BAS_ACCOUNTS, defaultVatCode } from "../lib/db/bas-accounts";
import { db } from "../lib/db";
import { accounts, companies } from "../lib/db/schema";

async function main() {
  const orgNumber = process.argv[2]?.trim();
  if (!orgNumber) {
    console.error("Användning: pnpm upgrade-accounts <organisationsnummer>");
    process.exit(1);
  }

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.orgNumber, orgNumber))
    .limit(1);
  if (!company) {
    console.error(`Inget företag med organisationsnummer ${orgNumber}.`);
    process.exit(1);
  }

  const existing = await db
    .select({ number: accounts.number })
    .from(accounts)
    .where(eq(accounts.companyId, company.id));
  const have = new Set(existing.map((row) => row.number));
  const missing = BAS_ACCOUNTS.filter((account) => !have.has(account.number));

  if (missing.length === 0) {
    console.log(
      `${company.name} har redan ${existing.length} konton; inget att lägga till.`
    );
    process.exit(0);
  }

  await db.insert(accounts).values(
    missing.map((account) => ({
      companyId: company.id,
      number: account.number,
      name: account.name,
      vatCode: defaultVatCode(account.number, account.name),
      active: true,
    }))
  );

  console.log(
    `${company.name}: lade till ${missing.length} BAS-konton (${existing.length} → ${existing.length + missing.length}).`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
