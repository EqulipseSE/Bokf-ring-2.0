import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
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
  bankgiro: text("bankgiro"),
  plusgiro: text("plusgiro"),
  // manad | kvartal | ar — styr periodlåsning och momsdeklaration.
  vatPeriod: text("vat_period").notNull().default("manad"),
  // faktura | kontant — sparas nu, används av AI-bokföring senare.
  accountingMethod: text("accounting_method").notNull().default("faktura"),
  // ab | ef
  legalForm: text("legal_form").notNull().default("ab"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    name: text("name").notNull(),
    unit: text("unit"),
    unitPrice: text("unit_price"),
    accountNumber: text("account_number"),
    vatCode: text("vat_code"),
  },
  (table) => [unique("articles_company_number").on(table.companyId, table.number)]
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    name: text("name").notNull(),
    identityNumber: text("identity_number"),
    customerType: text("customer_type").notNull(),
    address: text("address"),
    postalCode: text("postal_code"),
    city: text("city"),
    vatNumber: text("vat_number"),
    phone: text("phone"),
    email: text("email"),
    note: text("note"),
    paymentDays: integer("payment_days").notNull().default(30),
    receivableAccount: text("receivable_account"),
    invoiceDelivery: text("invoice_delivery").notNull().default("epost"),
    bankgiro: text("bankgiro"),
    plusgiro: text("plusgiro"),
    discount: text("discount"),
    agreementName: text("agreement_name"),
    agreementPath: text("agreement_path"),
    hidden: boolean("hidden").notNull().default(false),
  },
  (table) => [unique("customers_company_number").on(table.companyId, table.number)]
);

export const writeOffs = pgTable(
  "write_offs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    text: text("text").notNull(),
    accountNumber: text("account_number").notNull(),
  },
  (t) => [
    unique("write_offs_company_code_unique").on(t.companyId, t.code),
    index("write_offs_company_idx").on(t.companyId),
  ]
);

/** Kod + namn. Kopplas till voucher_lines.result_unit senare. */
export const resultUnits = pgTable(
  "result_units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
  },
  (t) => [
    unique("result_units_company_code_unique").on(t.companyId, t.code),
    index("result_units_company_idx").on(t.companyId),
  ]
);

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
    // true = Enter efter konto går till resultatenhet vid kontering.
    allowsResultUnit: boolean("allows_result_unit").notNull().default(false),
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

export const voucherEdits = pgTable(
  "voucher_edits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    voucherId: uuid("voucher_id")
      .notNull()
      .references(() => vouchers.id, { onDelete: "cascade" }),
    editedAt: timestamp("edited_at", { withTimezone: true }).notNull().defaultNow(),
    editedBy: uuid("edited_by")
      .notNull()
      .references(() => users.id),
    previousDate: date("previous_date").notNull(),
    previousText: text("previous_text").notNull(),
  },
  (t) => [index("voucher_edits_voucher_idx").on(t.voucherId)]
);

export const voucherEditLines = pgTable(
  "voucher_edit_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editId: uuid("edit_id")
      .notNull()
      .references(() => voucherEdits.id, { onDelete: "cascade" }),
    lineNumber: integer("line_number").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    debit: bigint("debit", { mode: "number" }).notNull().default(0),
    credit: bigint("credit", { mode: "number" }).notNull().default(0),
    vatCode: text("vat_code"),
    resultUnit: text("result_unit"),
  },
  (t) => [unique("voucher_edit_lines_line").on(t.editId, t.lineNumber)]
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
    resultUnit: text("result_unit"),
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

export const companiesRelations = relations(companies, ({ many, one }) => ({
  accounts: many(accounts),
  voucherSeries: many(voucherSeries),
  vouchers: many(vouchers),
  writeOffs: many(writeOffs),
  resultUnits: many(resultUnits),
  periodLock: one(companyPeriodLocks, {
    fields: [companies.id],
    references: [companyPeriodLocks.companyId],
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
export type Article = typeof articles.$inferSelect;
export type Customer = typeof customers.$inferSelect;

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    invoiceType: text("invoice_type").notNull(),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    customerNumber: text("customer_number"),
    customerName: text("customer_name").notNull(),
    reference: text("reference"),
    invoiceDate: date("invoice_date"),
    paymentDays: integer("payment_days"),
    dueDate: date("due_date"),
    purchaseDate: date("purchase_date"),
    ownComment: text("own_comment"),
    invoiceComment: text("invoice_comment"),
    pricesIncludeVat: boolean("prices_include_vat").notNull().default(false),
    freight: text("freight"),
    invoiceFee: text("invoice_fee"),
    currency: text("currency").notNull().default("SEK"),
    netOre: integer("net_ore").notNull(),
    vatOre: integer("vat_ore").notNull(),
    grossOre: integer("gross_ore").notNull(),
    roundingOre: integer("rounding_ore").notNull(),
    totalOre: integer("total_ore").notNull(),
    paymentDate: date("payment_date"),
  },
  (table) => [unique("invoices_company_number").on(table.companyId, table.number)]
);

export const invoiceLines = pgTable(
  "invoice_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    lineNumber: integer("line_number").notNull(),
    articleId: uuid("article_id").references(() => articles.id, { onDelete: "set null" }),
    articleNumber: text("article_number"),
    name: text("name"),
    unitPrice: text("unit_price"),
    quantity: text("quantity"),
    vatCode: text("vat_code"),
    accountNumber: text("account_number"),
    sumOre: integer("sum_ore").notNull(),
  },
  (table) => [unique("invoice_lines_invoice_line").on(table.invoiceId, table.lineNumber)]
);

export type Invoice = typeof invoices.$inferSelect;

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    name: text("name").notNull(),
    paymentDays: integer("payment_days").notNull().default(30),
    /** 0 betyder att fakturan ska fördelas för hand. */
    costAccount: text("cost_account").notNull().default("0"),
  },
  (table) => [unique("suppliers_company_number").on(table.companyId, table.number)]
);

export const supplierInvoices = pgTable(
  "supplier_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
    supplierNumber: text("supplier_number"),
    supplierName: text("supplier_name").notNull(),
    invoiceNumber: text("invoice_number").notNull(),
    levfakturaNumber: integer("levfaktura_number").notNull(),
    invoiceDate: date("invoice_date"),
    dueDate: date("due_date"),
    paymentDate: date("payment_date"),
    totalOre: integer("total_ore").notNull(),
    vatOre: integer("vat_ore").notNull(),
    freightOre: integer("freight_ore").notNull(),
    status: text("status").notNull().default("obetald"),
    bookedInK: boolean("booked_in_k").notNull().default(false),
    bookedInA: boolean("booked_in_a").notNull().default(false),
    documentId: uuid("document_id").references(() => companyDocuments.id, { onDelete: "set null" }),
  },
  (table) => [
    unique("supplier_invoices_company_number").on(
      table.companyId,
      table.supplierId,
      table.invoiceNumber
    ),
    unique("supplier_invoices_levfaktura_number").on(table.companyId, table.levfakturaNumber),
  ]
);

export const supplierInvoiceLines = pgTable(
  "supplier_invoice_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => supplierInvoices.id, { onDelete: "cascade" }),
    lineNumber: integer("line_number").notNull(),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    accountNumber: text("account_number").notNull(),
    debitOre: integer("debit_ore").notNull().default(0),
    creditOre: integer("credit_ore").notNull().default(0),
  },
  (table) => [unique("supplier_invoice_lines_line").on(table.invoiceId, table.lineNumber)]
);

export const bankConnections = pgTable("bank_connections", {
  companyId: uuid("company_id")
    .primaryKey()
    .references(() => companies.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  aspspName: text("aspsp_name").notNull(),
  aspspCountry: text("aspsp_country").notNull(),
  accountUids: text("account_uids").notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
});

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    accountUid: text("account_uid").notNull(),
    accountNumber: text("account_number").notNull(),
    bookAccountNumber: text("book_account_number"),
  },
  (table) => [primaryKey({ columns: [table.companyId, table.accountUid] })]
);

export const bankLinkStates = pgTable("bank_link_states", {
  state: text("state").primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bankTransactions = pgTable(
  "bank_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    accountUid: text("account_uid").notNull(),
    entryReference: text("entry_reference").notNull(),
    bookedDate: date("booked_date").notNull(),
    amountOre: integer("amount_ore").notNull(),
    currency: text("currency").notNull(),
    description: text("description").notNull().default(""),
    referenceNumber: text("reference_number"),
    voucherId: uuid("voucher_id").references(() => vouchers.id, { onDelete: "set null" }),
  },
  (table) => [
    unique("bank_transactions_entry").on(
      table.companyId,
      table.accountUid,
      table.entryReference
    ),
  ]
);

export const companyDocuments = pgTable("company_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  storagePath: text("storage_path").notNull(),
  contentHash: text("content_hash"),
  ocrNumber: text("ocr_number"),
  invoiceNumber: text("invoice_number"),
  totalOre: integer("total_ore"),
  voucherId: uuid("voucher_id").references(() => vouchers.id, { onDelete: "set null" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type CompanyPeriodLock = typeof companyPeriodLocks.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type VoucherSeries = typeof voucherSeries.$inferSelect;
export type Voucher = typeof vouchers.$inferSelect;
export type VoucherLine = typeof voucherLines.$inferSelect;
export type VoucherAttachment = typeof voucherAttachments.$inferSelect;
export type WriteOffRow = typeof writeOffs.$inferSelect;
export type ResultUnitRow = typeof resultUnits.$inferSelect;
