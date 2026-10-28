import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, timeEntries, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import {
  accountKindForUser,
  aggregateTimeReportRows,
  timeReportCaption,
  timeReportScope,
  type TimeReportRow,
  type TimeReportScope,
} from "@/lib/time-reports";

export const DEMO_COLLEAGUE_EMAIL = "erik@byran.se";
export const DEMO_COLLEAGUE_NAME = "Erik Eriksson";

const DEMO_COMPANIES = [
  { name: "Novus AB", orgNumber: "559101-0101" },
  { name: "Klöver AB", orgNumber: "559202-0202" },
] as const;

type DemoCompanyName = (typeof DEMO_COMPANIES)[number]["name"];

export async function listTimeReportRows(user: {
  id: string;
}): Promise<{ rows: TimeReportRow[]; scope: TimeReportScope; caption: string }> {
  await ensureDemoTimeEntries();
  const scope = timeReportScope(accountKindForUser(user), user.id);
  const entries = await db
    .select({
      companyId: timeEntries.companyId,
      companyName: companies.name,
      userId: timeEntries.userId,
      workDate: timeEntries.workDate,
      minutes: timeEntries.minutes,
    })
    .from(timeEntries)
    .innerJoin(companies, eq(timeEntries.companyId, companies.id));

  return {
    rows: aggregateTimeReportRows(entries, scope),
    scope,
    caption: timeReportCaption(scope),
  };
}

/** Demo-timmar så listan inte är tom. Ingen registreringsvy i det här steget. */
export async function ensureDemoTimeEntries(): Promise<void> {
  const existing = await db
    .select({ id: timeEntries.id })
    .from(timeEntries)
    .limit(1);
  if (existing.length > 0) return;

  const staff = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .orderBy(asc(users.createdAt));
  const primary = staff[0];
  if (!primary) return;

  const colleague = await ensureDemoColleague(staff);
  const companyIds = await ensureDemoCompanies();
  const novusId = companyIds.get("Novus AB");
  const kloverId = companyIds.get("Klöver AB");
  if (!novusId || !kloverId) return;

  await db.insert(timeEntries).values([
    {
      companyId: novusId,
      userId: primary.id,
      workDate: "2026-09-10",
      minutes: 120,
    },
    {
      companyId: novusId,
      userId: colleague.id,
      workDate: "2026-09-18",
      minutes: 60,
    },
    {
      companyId: novusId,
      userId: primary.id,
      workDate: "2026-10-08",
      minutes: 120,
    },
    {
      companyId: kloverId,
      userId: colleague.id,
      workDate: "2026-09-20",
      minutes: 180,
    },
  ]);
}

async function ensureDemoColleague(
  staff: { id: string; email: string }[]
): Promise<{ id: string }> {
  const found = staff.find((row) => row.email === DEMO_COLLEAGUE_EMAIL);
  if (found) return found;

  const [created] = await db
    .insert(users)
    .values({
      email: DEMO_COLLEAGUE_EMAIL,
      name: DEMO_COLLEAGUE_NAME,
      passwordHash: await hashPassword("testlosenord123"),
    })
    .returning({ id: users.id });
  if (!created) {
    throw new Error("Kunde inte skapa demokollegan för tidsrapporter.");
  }
  return created;
}

async function ensureDemoCompanies(): Promise<Map<DemoCompanyName, string>> {
  const ids = new Map<DemoCompanyName, string>();
  for (const company of DEMO_COMPANIES) {
    const existing = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.orgNumber, company.orgNumber))
      .limit(1);
    if (existing[0]) {
      ids.set(company.name, existing[0].id);
      continue;
    }
    const byName = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.name, company.name))
      .limit(1);
    if (byName[0]) {
      ids.set(company.name, byName[0].id);
      continue;
    }
    const [created] = await db
      .insert(companies)
      .values({ name: company.name, orgNumber: company.orgNumber })
      .returning({ id: companies.id });
    if (!created) {
      throw new Error(`Kunde inte skapa demoföretaget ${company.name}.`);
    }
    ids.set(company.name, created.id);
  }
  return ids;
}
