import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { guessDocumentKind } from "./document-sort";

const company = {
  name: "Test AB",
  orgNumber: "550101-0101",
  bankgiro: "555-5555",
  plusgiro: null,
};

describe("guessDocumentKind", () => {
  it("känner igen ett kvitto", () => {
    assert.equal(
      guessDocumentKind("foto.jpg", "Kvitto ICA tack för ditt köp", company).kind,
      "kvitto"
    );
  });

  it("läser bankgironr när fakturan är inläst som bild", () => {
    assert.equal(
      guessDocumentKind(
        "telia (1).pdf",
        "Här kommer din faktura. Bankgironr. 5014-1100 OCR-nr. 8841201",
        company
      ).kind,
      "leverantorsfaktura"
    );
  });

  it("ser en leverantörsfaktura när bankgironumret inte är vårt", () => {
    assert.equal(
      guessDocumentKind(
        "scan.pdf",
        "Faktura förfallodatum 2026-12-01 bankgiro 123-4567 org.nr 556677-8899",
        company
      ).kind,
      "leverantorsfaktura"
    );
  });

  it("ser en kundfaktura när bankgironumret är vårt", () => {
    assert.equal(
      guessDocumentKind(
        "faktura.pdf",
        "Faktura att betala bankgiro 555-5555 organisationsnummer 550101-0101",
        company
      ).kind,
      "kundfaktura"
    );
  });

  it("tar första organisationsnumret som utställare när båda finns", () => {
    assert.equal(
      guessDocumentKind(
        "faktura.pdf",
        "Faktura org.nr 556677-8899 kund 550101-0101",
        { ...company, bankgiro: null }
      ).kind,
      "leverantorsfaktura"
    );
  });

  it("ser en leverantörsfaktura när den är ställd till oss", () => {
    assert.equal(
      guessDocumentKind(
        "staples.pdf",
        "FAKTURA LEVERANTÖR Staples FAKTURERAS TILL Test AB OCR-nummer 3301988",
        company
      ).kind,
      "leverantorsfaktura"
    );
  });

  it("lägger en faktura utanför leverantörsreskontran som övrigt", () => {
    assert.equal(
      guessDocumentKind(
        "folksam.pdf",
        "Faktura företagsförsäkring bankgiro 830-1234",
        company
      ).kind,
      "ovrigt"
    );
    assert.equal(
      guessDocumentKind(
        "telia.pdf",
        "Faktura mobilabonnemang bankgiro 5014-1100",
        company
      ).kind,
      "leverantorsfaktura"
    );
  });

  it("ser ett löneunderlag på filnamnet", () => {
    assert.equal(guessDocumentKind("Lön 2026-09-15.pdf", "", company).kind, "lon");
  });

  it("gissar kvitto när fotot saknar text", () => {
    const guess = guessDocumentKind("IMG_2044.jpg", "", company);
    assert.equal(guess.kind, "kvitto");
    assert.equal(guess.sure, false);
  });
});
