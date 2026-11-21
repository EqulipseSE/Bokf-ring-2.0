import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { guessCostAccount, readInvoiceVat, skipsSupplierLedger, suggestedPostings } from "./voucher-suggestion";

describe("suggestedPostings", () => {
  it("läser momsunderlaget", () => {
    assert.deepEqual(
      readInvoiceVat("Momsunderlag 6 000,00 kr x 25% = 1 500,00 kr"),
      { netOre: 600_000, vatOre: 150_000, rate: 25 }
    );
  });

  it("föreslår intäkt och utgående moms på en kundfaktura", () => {
    assert.deepEqual(
      suggestedPostings({
        kind: "kundfaktura",
        text: "Redovisningstjänster. Momsunderlag 6 000,00 kr x 25% = 1 500,00 kr",
        revenueAccount: "3035",
      }),
      [
        { accountNumber: "3035", debitOre: 0, creditOre: 600_000 },
        { accountNumber: "2611", debitOre: 0, creditOre: 150_000 },
      ]
    );
  });

  it("föreslår bara ingående moms när kostnadskontot inte går att läsa", () => {
    assert.deepEqual(
      suggestedPostings({
        kind: "leverantorsfaktura",
        text: "Momsunderlag 784,00 kr x 25% = 196,00 kr",
        revenueAccount: null,
      }),
      [{ accountNumber: "2641", debitOre: 19_600, creditOre: 0 }]
    );
  });

  it("ser kontorsmaterial som 6110", () => {
    assert.equal(guessCostAccount("Pärmar, pennor, papper och anteckningsblock")?.account, "6110");
  });

  it("ser hyra som 5010 och delar beloppet när momsen inte står utskriven", () => {
    assert.equal(guessCostAccount("Hyra september, Kontorshuset AB")?.account, "5010");
    assert.deepEqual(
      suggestedPostings({
        kind: "leverantorsfaktura",
        text: "Hyra september, Kontorshuset AB",
        revenueAccount: null,
        grossOre: 1_850_000,
      }),
      [
        { accountNumber: "5010", debitOre: 1_480_000, creditOre: 0 },
        { accountNumber: "2641", debitOre: 370_000, creditOre: 0 },
      ]
    );
  });

  it("bokar leverantörsfaktura mot 2440 på fakturametoden", () => {
    assert.deepEqual(
      suggestedPostings({
        kind: "leverantorsfaktura",
        text: "Hyra september, Kontorshuset AB",
        revenueAccount: null,
        grossOre: 1_850_000,
        accountingMethod: "faktura",
        backedBySupplierInvoice: true,
      }),
      [{ accountNumber: "2440", debitOre: 1_850_000, creditOre: 0 }]
    );
  });

  it("låter försäkring gå direkt mot kostnadskontot", () => {
    assert.deepEqual(
      suggestedPostings({
        kind: "leverantorsfaktura",
        text: "Folksam företagsförsäkring",
        revenueAccount: null,
        grossOre: 2_400_00,
        accountingMethod: "faktura",
      }),
      [{ accountNumber: "6310", debitOre: 2_400_00, creditOre: 0 }]
    );
  });

  it("bokar utlandsinköp som leverantörsfaktura", () => {
    assert.equal(skipsSupplierLedger("Utlandsinköp Adobe Irland"), false);
    assert.deepEqual(
      suggestedPostings({
        kind: "leverantorsfaktura",
        text: "Utlandsinköp Adobe Irland",
        revenueAccount: null,
        grossOre: 500_00,
        accountingMethod: "faktura",
        backedBySupplierInvoice: true,
      }),
      [{ accountNumber: "2440", debitOre: 500_00, creditOre: 0 }]
    );
  });

  it("håller skatt, abonnemang, tull, böter, medlemsavgift och bankavgift utanför 2440", () => {
    for (const text of [
      "Transportstyrelsen fordonsskatt",
      "Skatteverket F-skatt",
      "Förskottsbetalt abonnemang ej bindande",
      "Tullavgift",
      "Parkeringsbot",
      "Frivillig medlemsavgift",
      "Proformafaktura",
      "Prenumeration tidskrift",
      "Bankavgift",
    ]) {
      assert.equal(skipsSupplierLedger(text), true, text);
    }
  });

  it("bokar kundinbetalning mot 1510 på fakturametoden", () => {
    assert.deepEqual(
      suggestedPostings({
        kind: "kundfaktura",
        text: "Redovisningstjänster. Momsunderlag 6 000,00 kr x 25% = 1 500,00 kr",
        revenueAccount: "3035",
        grossOre: 750_000,
        accountingMethod: "faktura",
      }),
      [{ accountNumber: "1510", debitOre: 0, creditOre: 750_000 }]
    );
  });

  it("lägger kontorsmaterial och moms från fakturatexten", () => {
    assert.deepEqual(
      suggestedPostings({
        kind: "leverantorsfaktura",
        text: "Pärmar och pennor. Momsunderlag 784,00 kr x 25% = 196,00 kr",
        revenueAccount: null,
      }),
      [
        { accountNumber: "6110", debitOre: 78_400, creditOre: 0 },
        { accountNumber: "2641", debitOre: 19_600, creditOre: 0 },
      ]
    );
  });
});
