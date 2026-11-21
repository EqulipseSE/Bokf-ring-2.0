import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchSupplierInvoice } from "./supplier-invoice-match";

const invoices = [
  {
    id: "staples",
    supplierName: "Staples",
    invoiceNumber: "3301988",
    totalOre: 98000,
    paymentDate: "2026-09-17",
    documentId: "doc",
  },
  {
    id: "hyra-1",
    supplierName: "Kontorshuset AB",
    invoiceNumber: "4521981",
    totalOre: 1850000,
    paymentDate: "2026-09-02",
    documentId: null,
  },
  {
    id: "hyra-2",
    supplierName: "Kontorshuset AB",
    invoiceNumber: "4522104",
    totalOre: 1850000,
    paymentDate: "2026-10-01",
    documentId: null,
  },
];

describe("matchSupplierInvoice", () => {
  it("kräver samma belopp och fakturanummer", () => {
    const match = matchSupplierInvoice(
      { amountOre: -98000, description: "Betalning Staples", referenceNumber: "3301988" },
      invoices
    );
    assert.deepEqual(
      match?.map((part) => [part.invoice.id, part.ore]),
      [["staples", 98000]]
    );
  });

  it("väljer rätt faktura när samma leverantör har flera belopp", () => {
    const match = matchSupplierInvoice(
      { amountOre: -1850000, description: "Kontorshuset AB", referenceNumber: "4522104" },
      invoices
    );
    assert.deepEqual(
      match?.map((part) => part.invoice.id),
      ["hyra-2"]
    );
  });

  it("gissar inte när flera fakturor har samma belopp och namn", () => {
    const match = matchSupplierInvoice(
      { amountOre: -1850000, description: "Kontorshuset AB hyra", referenceNumber: null },
      invoices
    );
    assert.equal(match, null);
  });

  it("delar påminnelsefakturan i grundfaktura och avgift", () => {
    const match = matchSupplierInvoice(
      { amountOre: -506000, description: "Påminnelse Kontorshuset AB", referenceNumber: "9001" },
      [
        ...invoices,
        {
          id: "grund",
          supplierName: "Kontorshuset AB",
          invoiceNumber: "1001",
          totalOre: 500000,
          paymentDate: null,
          documentId: null,
        },
        {
          id: "paminnelse",
          supplierName: "Kontorshuset AB",
          invoiceNumber: "9001",
          totalOre: 506000,
          paymentDate: null,
          documentId: "paminnelse-doc",
        },
      ]
    );
    assert.deepEqual(
      match?.map((part) => [part.invoice.id, part.ore]),
      [
        ["grund", 500000],
        ["paminnelse", 6000],
      ]
    );
  });

  it("matchar inte inbetalningar", () => {
    const match = matchSupplierInvoice(
      { amountOre: 98000, description: "Staples", referenceNumber: "3301988" },
      invoices
    );
    assert.equal(match, null);
  });
});
