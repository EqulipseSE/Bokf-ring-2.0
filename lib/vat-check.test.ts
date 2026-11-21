import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { outgoingVatReview, voucherVatHint } from "./vat-check";

const ore = (kronor: number) => kronor * 100;

describe("voucherVatHint", () => {
  it("flaggar utgående moms mot fel konto", () => {
    const hint = voucherVatHint([
      { accountNumber: "1930", accountName: "Företagskonto", vatCode: null, debitOre: ore(1250), creditOre: 0 },
      { accountNumber: "2611", accountName: "Utgående moms 25 %", vatCode: "U25", debitOre: 0, creditOre: ore(250) },
      { accountNumber: "4011", accountName: "Inköp varor", vatCode: null, debitOre: 0, creditOre: ore(1000) },
    ]);
    assert.equal(hint, "ej");
  });

  it("godkänner 25 % på försäljning", () => {
    const hint = voucherVatHint([
      { accountNumber: "1930", accountName: "Företagskonto", vatCode: null, debitOre: ore(1250), creditOre: 0 },
      { accountNumber: "2611", accountName: "Utgående moms 25 %", vatCode: "U25", debitOre: 0, creditOre: ore(250) },
      { accountNumber: "3001", accountName: "Försäljning 25 %", vatCode: "U25", debitOre: 0, creditOre: ore(1000) },
    ]);
    assert.equal(hint, "ok");
  });

  it("visar kontrollen även för 12 och 6 procents utgående moms", () => {
    const hint = voucherVatHint([
      { accountNumber: "1930", accountName: "Företagskonto", vatCode: null, debitOre: ore(1060), creditOre: 0 },
      { accountNumber: "2631", accountName: "Utgående moms 6 %", vatCode: "U6", debitOre: 0, creditOre: ore(60) },
      { accountNumber: "3003", accountName: "Försäljning 6 %", vatCode: "U6", debitOre: 0, creditOre: ore(1000) },
    ]);
    assert.equal(hint, "ok");
  });

  it("visar inget på en kostnad utan utgående moms eller försäljningskonto", () => {
    const hint = voucherVatHint([
      { accountNumber: "1930", accountName: "Företagskonto", vatCode: null, debitOre: 0, creditOre: ore(1250) },
      { accountNumber: "2641", accountName: "Ingående moms", vatCode: "I25", debitOre: ore(250), creditOre: 0 },
      { accountNumber: "4011", accountName: "Inköp varor", vatCode: null, debitOre: ore(1000), creditOre: 0 },
    ]);
    assert.equal(hint, null);
  });

  it("visar inget när ingen moms är inblandad", () => {
    const hint = voucherVatHint([
      { accountNumber: "1930", accountName: "Företagskonto", vatCode: null, debitOre: ore(100), creditOre: 0 },
      { accountNumber: "2013", accountName: "Egna uttag", vatCode: null, debitOre: 0, creditOre: ore(100) },
    ]);
    assert.equal(hint, null);
  });
});

describe("outgoingVatReview", () => {
  it("summerar omsättning och förväntad utgående moms", () => {
    const review = outgoingVatReview([
      { accountNumber: "1930", accountName: "Företagskonto", vatCode: null, debitOre: ore(1250), creditOre: 0 },
      { accountNumber: "2611", accountName: "Utgående moms 25 %", vatCode: "U25", debitOre: 0, creditOre: ore(250) },
      { accountNumber: "3001", accountName: "Försäljning 25 %", vatCode: "U25", debitOre: 0, creditOre: ore(1000) },
    ]);
    assert.equal(review.turnoverOre, ore(1000));
    assert.equal(review.expectedOre, ore(250));
    assert.equal(review.reportedOre, ore(250));
    assert.equal(review.mismatch, false);
  });

  it("markerar när intäktskontot inte stämmer med utgående moms", () => {
    const review = outgoingVatReview([
      { accountNumber: "2611", accountName: "Utgående moms 25 %", vatCode: "U25", debitOre: 0, creditOre: ore(200) },
      { accountNumber: "3001", accountName: "Försäljning 25 %", vatCode: "U25", debitOre: 0, creditOre: ore(1000) },
    ]);
    assert.equal(review.mismatch, true);
    assert.equal(review.expectedOre, ore(250));
    assert.equal(review.reportedOre, ore(200));
  });
});
