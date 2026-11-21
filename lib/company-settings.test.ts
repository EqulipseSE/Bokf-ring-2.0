import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCOUNTING_METHOD_LABELS,
  VAT_PERIOD_LABELS,
  accountingMethodLabel,
  parseAccountingMethod,
  parseLegalForm,
  parseVatPeriodKind,
  vatPeriodLabel,
} from "./company-settings";

describe("parseVatPeriodKind", () => {
  it("godkänner månad, kvartal och helår", () => {
    assert.deepEqual(parseVatPeriodKind("manad"), { ok: true, value: "manad" });
    assert.deepEqual(parseVatPeriodKind("kvartal"), {
      ok: true,
      value: "kvartal",
    });
    assert.deepEqual(parseVatPeriodKind("ar"), { ok: true, value: "ar" });
    assert.equal(parseVatPeriodKind("vecka").ok, false);
    assert.equal(vatPeriodLabel("kvartal"), VAT_PERIOD_LABELS.kvartal);
  });
});

describe("parseLegalForm", () => {
  it("godkänner aktiebolag och enskild firma", () => {
    assert.deepEqual(parseLegalForm("ab"), { ok: true, value: "ab" });
    assert.deepEqual(parseLegalForm("ef"), { ok: true, value: "ef" });
    assert.equal(parseLegalForm("hb").ok, false);
  });
});

describe("parseAccountingMethod", () => {
  it("godkänner faktura och kontant", () => {
    assert.deepEqual(parseAccountingMethod("faktura"), {
      ok: true,
      value: "faktura",
    });
    assert.deepEqual(parseAccountingMethod("kontant"), {
      ok: true,
      value: "kontant",
    });
    assert.equal(parseAccountingMethod("").ok, false);
    assert.equal(
      accountingMethodLabel("kontant"),
      ACCOUNTING_METHOD_LABELS.kontant
    );
  });
});
