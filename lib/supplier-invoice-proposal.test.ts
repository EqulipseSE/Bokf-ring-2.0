import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { proposeSupplierInvoice, type BankPayment } from "./supplier-invoice-proposal";

const payments: BankPayment[] = [
  {
    date: "2026-09-02",
    amountOre: -1_850_000,
    referenceNumber: "4521981",
    description: "Hyra september, Kontorshuset AB",
  },
  {
    date: "2026-09-08",
    amountOre: -249_900,
    referenceNumber: "8841201",
    description: "Telia företagsabonnemang",
  },
  {
    date: "2026-09-17",
    amountOre: -98_000,
    referenceNumber: "3301988",
    description: "Staples kontorsmaterial",
  },
];

describe("proposeSupplierInvoice", () => {
  it("föreslår hyra från kontoutdraget när fakturan saknar text", () => {
    const proposal = proposeSupplierInvoice(
      {
        documentId: "1",
        fileName: "Faktura 4521981.pdf",
        text: "",
        invoiceNumber: "4521981",
        totalOre: null,
      },
      payments
    );
    assert.equal(proposal?.supplierName, "Kontorshuset AB");
    assert.equal(proposal?.costAccount, "5010");
    assert.equal(proposal?.totalOre, 1_850_000);
    assert.equal(proposal?.invoiceDate, "2026-09-02");
    assert.equal(proposal?.paymentDate, "2026-09-02");
  });

  it("föreslår 6110 för kontorsmaterial", () => {
    const proposal = proposeSupplierInvoice(
      {
        documentId: "2",
        fileName: "-staples-.pdf",
        text: "Fakturanummer 3301988 Att betala 980,00",
        invoiceNumber: "3301988",
        totalOre: 98_000,
      },
      payments
    );
    assert.equal(proposal?.supplierName, "Staples");
    assert.equal(proposal?.costAccount, "6110");
  });

  it("tar med Telia som leverantörsfaktura på 6212", () => {
    const proposal = proposeSupplierInvoice(
      {
        documentId: "3",
        fileName: "telia (1).pdf",
        text: "",
        invoiceNumber: null,
        totalOre: null,
      },
      payments
    );
    assert.equal(proposal?.supplierName, "Telia");
    assert.equal(proposal?.invoiceNumber, "8841201");
    assert.equal(proposal?.costAccount, "6212");
    assert.equal(proposal?.totalOre, 249_900);
  });

  it("bokför bara påminnelse, inkasso och ränta när grundfakturan finns", () => {
    const proposal = proposeSupplierInvoice(
      {
        documentId: "5",
        fileName: "Kontorshuset paminnelse.pdf",
        text: "Påminnelse fakturanummer 1001. Påminnelseavgift 60,00. Inkassoavgift 180,00. Dröjsmålsränta 20,00. Att betala 5 260,00",
        invoiceNumber: "1001",
        totalOre: 526_000,
      },
      [],
      [{ supplierName: "Kontorshuset AB", invoiceNumber: "1001", totalOre: 500_000 }]
    );
    assert.equal(proposal?.totalOre, 26_000);
    assert.equal(proposal?.vatOre, 0);
    assert.deepEqual(proposal?.lines, [
      { accountNumber: "5711", debitOre: 6_000, creditOre: 0 },
      { accountNumber: "5711", debitOre: 18_000, creditOre: 0 },
      { accountNumber: "8422", debitOre: 2_000, creditOre: 0 },
      { accountNumber: "2440", debitOre: 0, creditOre: 26_000 },
    ]);
  });

  it("hoppar över ett förskottsbetalt abonnemang", () => {
    assert.equal(
      proposeSupplierInvoice(
        {
          documentId: "4",
          fileName: "spotify.pdf",
          text: "Förskottsbetalt abonnemang, ej bindande. Fakturanummer 99",
          invoiceNumber: "99",
          totalOre: 10_000,
        },
        []
      ),
      null
    );
  });
});
