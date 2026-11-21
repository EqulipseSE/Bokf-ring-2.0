import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { duplicateDocumentMessage, readDocumentIdentity } from "./document-duplicate";

const original = readDocumentIdentity(
  "faktura.pdf",
  "Fakturanummer 1002 OCR 1002 Att betala 8 750,00 kr",
  "hash-a"
);

describe("document duplicates", () => {
  it("läser OCR, fakturanummer och totalsumma", () => {
    assert.equal(original.ocrNumber, "1002");
    assert.equal(original.invoiceNumber, "1002");
    assert.equal(original.totalOre, 875_000);
    assert.equal(original.reminder, false);
  });

  it("stoppar samma faktura en gång till", () => {
    const again = readDocumentIdentity(
      "kopia.pdf",
      "Fakturanummer 1002 Att betala 8 750,00",
      "hash-b"
    );
    assert.equal(
      duplicateDocumentMessage([original], again),
      "Fakturan finns redan. En påminnelse går att lägga in om totalsumman skiljer sig."
    );
  });

  it("släpper in en påminnelse med högre totalsumma", () => {
    const reminder = readDocumentIdentity(
      "paminnelse.pdf",
      "Påminnelse fakturanummer 1002 påminnelseavgift och ränta. Att betala 8 910,00 kr",
      "hash-c"
    );
    assert.equal(reminder.reminder, true);
    assert.equal(reminder.totalOre, 891_000);
    assert.equal(duplicateDocumentMessage([original], reminder), null);
  });

  it("stoppar en påminnelse med samma totalsumma", () => {
    const reminder = readDocumentIdentity(
      "paminnelse.pdf",
      "Påminnelse fakturanummer 1002 Att betala 8 750,00 kr",
      "hash-d"
    );
    assert.equal(duplicateDocumentMessage([original], reminder)?.includes("påminnelse"), true);
  });

  it("stoppar exakt samma fil", () => {
    assert.equal(
      duplicateDocumentMessage([original], { ...original }),
      "Underlaget finns redan."
    );
  });
});
