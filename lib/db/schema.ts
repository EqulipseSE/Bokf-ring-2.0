import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable("sessions", {
  // SHA-256-hash av sessionskakans token — själva token lagras aldrig i databasen.
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  // Format NNNNNN-NNNN, valideras i lib/organisationsnummer.ts.
  orgNumber: text("org_number").notNull().unique(),
  // manad | kvartal | ar — styr periodlåsning och momsdeklaration.
  vatPeriod: text("vat_period").notNull().default("manad"),
  // faktura | kontant — sparas nu, används av AI-bokföring senare.
  accountingMethod: text("accounting_method").notNull().default("faktura"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Ett lock per företag: alla datum t.o.m. lockedThrough är låsta. */
export const companyPeriodLocks = pgTable("company_period_locks", {
  companyId: uuid("company_id")
    .primaryKey()
    .references(() => companies.id, { onDelete: "cascade" }),
  lockedThrough: date("locked_through").notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lockedBy: uuid("locked_by")
    .notNull()
    .references(() => users.id),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    name: text("name").notNull(),
    // Systemkod från lib/vat-codes.ts, valfri default vid kontering.
    vatCode: text("vat_code"),
    active: boolean("active").notNull().default(true),
  },
  (t) => [
    unique("accounts_company_number_unique").on(t.companyId, t.number),
    index("accounts_company_idx").on(t.companyId),
  ]
);

export const voucherSeries = pgTable(
  "voucher_series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    letter: text("letter").notNull(),
    description: text("description").notNull(),
    nextNumber: integer("next_number").notNull().default(1),
  },
  (t) => [unique("voucher_series_company_letter_unique").on(t.companyId, t.letter)]
);

export const vouchers = pgTable(
  "vouchers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => voucherSeries.id),
    number: integer("number").notNull(),
    date: date("date").notNull(),
    text: text("text").notNull(),
    registeredBy: uuid("registered_by")
      .notNull()
      .references(() => users.id),
    registeredAt: timestamp("registered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status").notNull().default("registrerad"),
    correctsVoucherId: uuid("corrects_voucher_id"),
    // Ingående balans / IB-korrigering. Vanliga periodbokningar är false.
    isOpening: boolean("is_opening").notNull().default(false),
  },
  (t) => [
    unique("vouchers_series_number_unique").on(t.seriesId, t.number),
    index("vouchers_company_registered_idx").on(t.companyId, t.registeredAt),
  ]
);

export const voucherAttachments = pgTable(
  "voucher_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    voucherId: uuid("voucher_id")
      .notNull()
      .references(() => vouchers.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storagePath: text("storage_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("voucher_attachments_voucher_unique").on(t.voucherId)]
);

/**
 * Arbetad tid per medarbetare och företag. Listan aggregerar per
 * företag × kalendermånad. Huvudkonto ser alla rader, anställd bara
 * egna (filtrering i lib/time-reports.ts — kontotyper byggs i BF-17).
 */
export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    workDate: date("work_date").notNull(),
    startTime: text("start_time").notNull().default("08:00"),
    summary: text("summary").notNull().default(""),
    minutes: integer("minutes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("time_entries_company_date_idx").on(t.companyId, t.workDate),
    index("time_entries_user_idx").on(t.userId),
    check("time_entries_minutes_positive", sql`${t.minutes} > 0`),
  ]
);

export const voucherLines = pgTable(
  "voucher_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    voucherId: uuid("voucher_id")
      .notNull()
      .references(() => vouchers.id, { onDelete: "restrict" }),
    lineNumber: integer("line_number").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    debit: bigint("debit", { mode: "number" }).notNull().default(0),
    credit: bigint("credit", { mode: "number" }).notNull().default(0),
    vatCode: text("vat_code"),
    text: text("text"),
  },
  (t) => [
    unique("voucher_lines_voucher_line_unique").on(t.voucherId, t.lineNumber),
    index("voucher_lines_voucher_idx").on(t.voucherId),
    check(
      "voucher_lines_debit_xor_credit",
      sql`${t.debit} >= 0 AND ${t.credit} >= 0 AND ((${t.debit} > 0 AND ${t.credit} = 0) OR (${t.credit} > 0 AND ${t.debit} = 0))`
    ),
  ]
);

export const usersRelations = relations(users, ({ many }) => ({
  timeEntries: many(timeEntries),
}));

export const companiesRelations = relations(companies, ({ many, one }) => ({
  accounts: many(accounts),
  voucherSeries: many(voucherSeries),
  vouchers: many(vouchers),
  timeEntries: many(timeEntries),
  periodLock: one(companyPeriodLocks, {
    fields: [companies.id],
    references: [companyPeriodLocks.companyId],
  }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  company: one(companies, {
    fields: [timeEntries.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
}));

export const companyPeriodLocksRelations = relations(
  companyPeriodLocks,
  ({ one }) => ({
    company: one(companies, {
      fields: [companyPeriodLocks.companyId],
      references: [companies.id],
    }),
    lockedByUser: one(users, {
      fields: [companyPeriodLocks.lockedBy],
      references: [users.id],
    }),
  })
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  company: one(companies, {
    fields: [accounts.companyId],
    references: [companies.id],
  }),
}));

export const voucherSeriesRelations = relations(voucherSeries, ({ one, many }) => ({
  company: one(companies, {
    fields: [voucherSeries.companyId],
    references: [companies.id],
  }),
  vouchers: many(vouchers),
}));

export const vouchersRelations = relations(vouchers, ({ one, many }) => ({
  company: one(companies, {
    fields: [vouchers.companyId],
    references: [companies.id],
  }),
  series: one(voucherSeries, {
    fields: [vouchers.seriesId],
    references: [voucherSeries.id],
  }),
  registeredByUser: one(users, {
    fields: [vouchers.registeredBy],
    references: [users.id],
  }),
  corrects: one(vouchers, {
    fields: [vouchers.correctsVoucherId],
    references: [vouchers.id],
    relationName: "voucher_correction",
  }),
  lines: many(voucherLines),
  attachment: one(voucherAttachments),
}));

export const voucherAttachmentsRelations = relations(
  voucherAttachments,
  ({ one }) => ({
    voucher: one(vouchers, {
      fields: [voucherAttachments.voucherId],
      references: [vouchers.id],
    }),
  })
);

export const voucherLinesRelations = relations(voucherLines, ({ one }) => ({
  voucher: one(vouchers, {
    fields: [voucherLines.voucherId],
    references: [vouchers.id],
  }),
  account: one(accounts, {
    fields: [voucherLines.accountId],
    references: [accounts.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type CompanyPeriodLock = typeof companyPeriodLocks.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type VoucherSeries = typeof voucherSeries.$inferSelect;
export type Voucher = typeof vouchers.$inferSelect;
export type VoucherLine = typeof voucherLines.$inferSelect;
export type VoucherAttachment = typeof voucherAttachments.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
